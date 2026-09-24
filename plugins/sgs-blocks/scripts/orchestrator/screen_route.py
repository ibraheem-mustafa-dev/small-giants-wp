"""Screen route: which screen of a multi-screen draft a clone run turns into the page.

A Claude Design prototype holds several screens in one file, each in its own
``<main data-screen-label="...">`` gated by an ``isX`` flag. Converting the whole file piles every
screen onto one page. This module tags each Stage 1 boundary with the screen it sits in and says
which screen this run clones; Stage 4 then skips the others (reported, never dropped silently) and
admits the chosen screen's classless sections as containers.

The chosen screen is, in order: ``--screen``, else the screen the README routes table sends to ``/``
cross-checked against the draft's own default marker (``hint-placeholder-val="{{ true }}"`` on the
gate). When those two disagree the run halts. A draft with fewer than two labelled screens (every
static draft) is left completely alone: ``apply`` returns None.

The README also lists the screen's sections by name. A section whose name, or a string the README
quotes for it, appears verbatim in a boundary's text is recorded as ``readme_section`` on that
boundary. It is a label only: it never chooses a block.

A boundary outside every screen that shows only while an overlay is open (a drawer, modal, cart or
mega panel named by the draft manifest, ``draft-manifest/manifest.py``) is tagged
``screen_role="overlay"`` with the overlay's entity id. It is that overlay's content, not this
page's: Stage 4 reports it against the overlay and never converts it into the page.
"""
from __future__ import annotations

import pathlib
import re
import sys

_SCRIPTS = pathlib.Path(__file__).resolve().parent.parent
for _p in (str(_SCRIPTS), str(_SCRIPTS / "draft-manifest")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from readme_routes import match_route, norm_view, read_readme_routes, read_screen_sections, same_word  # noqa: E402
from shared_utils import read_readme_text  # noqa: E402

_FLAG_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")
_TRUE_MARKERS = ("{{ true }}", "{{true}}")


class ScreenRouteError(Exception):
    """The draft's screens and README cannot be reconciled; the run should halt with this message."""


def find_screens(soup) -> list[dict]:
    """Every labelled screen: label, gate flag, whether its gate carries the default marker."""
    screens = []
    for main in soup.find_all("main", attrs={"data-screen-label": True}):
        gate = main.parent if main.parent is not None and main.parent.name == "sc-if" else None
        flag = _FLAG_RE.search(gate.get("value", "")) if gate is not None else None
        marker = gate is not None and (gate.get("hint-placeholder-val") or "").strip() in _TRUE_MARKERS
        screens.append({"label": main["data-screen-label"], "flag": flag.group(1) if flag else None, "default_marker": marker})
    return screens


def choose_screen(screens: list[dict], routes: list[dict], requested: str | None) -> tuple[dict | None, str]:
    """(screen, how it was chosen). ``None`` when the draft names no default and none was requested."""
    labels = ", ".join(s["label"] for s in screens)
    if requested:
        hit = next((s for s in screens if requested.lower() == s["label"].lower()
                    or same_word(requested, s["label"]) or same_word(requested, s["flag"] or "")), None)
        if hit is None:
            raise ScreenRouteError(f"--screen '{requested}' matches no screen in the draft. Screens: {labels}")
        return hit, "--screen"
    by_readme = next((s for s in screens if (match_route(s["flag"] or "", s["label"], routes) or {}).get("route", "").strip() == "/"), None)
    by_marker = next((s for s in screens if s["default_marker"]), None)
    if by_readme and by_marker and by_readme is not by_marker:
        raise ScreenRouteError(
            f"the README routes '/' to screen '{by_readme['label']}' but the draft marks '{by_marker['label']}' as its "
            f"default. Pass --screen <label> to choose. Screens: {labels}")
    if by_readme or by_marker:
        return by_readme or by_marker, "README route /" if by_readme else "draft default marker"
    return None, ""


def _phrases(section: dict) -> list[tuple[str, bool]]:
    """(phrase, quoted) pairs that identify a section: its name and that name minus trailing words
    (two words at least), then each string the README quotes for it, whole."""
    name, *quoted = section["phrases"]
    words = name.split()
    out = [(" ".join(words[:n]), False) for n in range(len(words), 0, -1) if n >= 2 or n == len(words)]
    out += [(q, True) for q in quoted]
    return [(p, q) for p, q in dict.fromkeys(out) if len(p) >= 4]


def _count(text: str, phrase: str) -> int:
    return len(re.findall(r"(?<!\w)%s(?!\w)" % re.escape(phrase.lower()), text))


def label_sections(texts: dict[str, str], sections: list[dict], full_text: str = "") -> dict[str, str]:
    """boundary id -> README section name, from verbatim phrases only.

    A phrase counts only when it appears in exactly one boundary's text. A quoted string must also
    appear exactly once in the whole draft: the README quotes states ("Photo to come") that recur on
    many cards, and a recurring string identifies no section. A boundary matched by phrases of two
    sections is left unlabelled."""
    lowered, whole = {bid: t.lower() for bid, t in texts.items()}, full_text.lower()
    found: dict[str, dict[str, int]] = {}
    for sec in sections:
        for phrase, quoted in _phrases(sec):
            if quoted and _count(whole, phrase) != 1:
                continue
            hits = [bid for bid, t in lowered.items() if _count(t, phrase)]
            if len(hits) == 1:
                cur = found.setdefault(hits[0], {})
                cur[sec["name"]] = max(cur.get(sec["name"], 0), len(phrase))
    return {bid: next(iter(names)) for bid, names in found.items() if len(names) == 1}


def overlay_flags(manifest: dict | None) -> dict[str, dict]:
    """gate flag -> {id, kind, target} for every overlay entity in a draft manifest, its panel flags
    included (a mega menu's ``megaSun`` panel belongs to the ``megaAny`` overlay)."""
    flags: dict[str, dict] = {}
    for e in (manifest or {}).get("entities", []):
        if not str(e.get("id", "")).startswith("overlay:"):
            continue
        info = {"id": e["id"], "kind": e.get("kind"), "target": e.get("target")}
        for f in [e.get("flag"), *(e.get("panels") or [])]:
            if f:
                flags[f] = info
    return flags


def overlay_of(el, flags: dict[str, dict]) -> dict | None:
    """The overlay whose ``<sc-if>`` gate encloses ``el`` (the outermost one), else None."""
    hit = None
    for gate in el.find_parents("sc-if"):
        m = _FLAG_RE.search(gate.get("value", ""))
        if m and m.group(1) in flags:
            hit = flags[m.group(1)]
    return hit


def apply(voter_output: dict, tagged_html: str, mockup_dir: pathlib.Path, requested: str | None = None,
          overlays: dict[str, dict] | None = None) -> dict | None:
    """Tag ``voter_output['boundaries']`` in place with ``screen``, ``screen_role`` and, for the chosen
    screen, ``readme_section``; return a summary. ``None`` (nothing touched) for a draft with fewer
    than two labelled screens. ``overlays`` is ``overlay_flags(manifest)``; a boundary outside every
    screen that sits under one of those gates gets ``screen_role="overlay"`` and ``overlay``."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(tagged_html, "html.parser")
    screens = find_screens(soup)
    if len(screens) < 2:
        return None
    readme = read_readme_text(mockup_dir)
    routes = read_readme_routes(readme)
    chosen, how = choose_screen(screens, routes, requested)
    if chosen is None:
        return {"active": False, "reason": "no default screen: the README routes nothing to '/' and the draft marks none",
                "screens": [s["label"] for s in screens]}
    row = match_route(chosen["flag"] or "", chosen["label"], routes) or {}
    sections = read_screen_sections(readme, [chosen["label"], row.get("view", ""), norm_view(chosen["flag"] or "")])
    per_screen: dict[str, dict] = {s["label"]: {"boundaries": [], "text_chars": 0} for s in screens}
    outside: list[str] = []
    in_overlays: dict[str, list[str]] = {}
    default_texts: dict[str, str] = {}
    for b in voter_output.get("boundaries", []):
        el = soup.find(attrs={"data-sgs-boundary-id": b["boundary_id"]})
        if el is None:
            continue
        holder = el if el.get("data-screen-label") else el.find_parent("main", attrs={"data-screen-label": True})
        text = el.get_text(" ", strip=True)
        b["screen_text_chars"] = len(text)
        if holder is None:
            ov = overlay_of(el, overlays or {})
            if ov is not None:
                b["screen"], b["screen_role"], b["overlay"] = None, "overlay", ov
                in_overlays.setdefault(ov["id"], []).append(b["boundary_id"])
                continue
            b["screen"], b["screen_role"] = None, "outside"
            outside.append(b["boundary_id"])
            continue
        label = holder["data-screen-label"]
        b["screen"] = label
        b["screen_role"] = "default" if label == chosen["label"] else "other"
        per_screen[label]["boundaries"].append(b["boundary_id"])
        if b["screen_role"] == "other" and b.get("boundary_kind") != "item":
            per_screen[label]["text_chars"] += len(text)
        if b["screen_role"] == "default" and b.get("boundary_kind", "container") == "container":
            default_texts[b["boundary_id"]] = text
    labelled = label_sections(default_texts, sections, soup.get_text(" ", strip=True))
    for b in voter_output.get("boundaries", []):
        if b["boundary_id"] in labelled:
            b["readme_section"] = labelled[b["boundary_id"]]
    return {"active": True, "chosen": chosen["label"], "chosen_by": how, "route": row.get("route"),
            "screens": [{"label": s["label"], "flag": s["flag"], **per_screen[s["label"]]} for s in screens],
            "outside_screens": outside, "overlays": in_overlays, "readme_sections_listed": [s["name"] for s in sections],
            "readme_section_labels": labelled}
