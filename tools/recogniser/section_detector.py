"""Module 1 -- Section Detector.

Walks an HTML document and returns a list of sections keyed by their
semantic role (header / main / aside / footer) plus a class signature
that downstream modules use as a fingerprint key.

This is mechanical DOM walking -- no AI, no network, no subprocess.

Spec: .claude/plans/recogniser-v1.md  Module 1.

Output schema (per section):
    {
        "section_id":     str,   # stable slug
        "semantic_role":  str,   # header | main | aside | footer
        "html_fragment":  str,   # raw HTML of the section
        "class_signature": list[str],  # sorted unique top-level class names (cap 30)
    }

CLI:
    python tools/recogniser/section_detector.py <html-file>

Python API:
    from tools.recogniser.section_detector import detect_sections
    sections = detect_sections(html)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterable

try:  # prefer lxml for speed; fall back to stdlib parser if unavailable
    import lxml  # noqa: F401
    _PARSER = "lxml"
except ImportError:  # pragma: no cover - environment dependent
    _PARSER = "html.parser"

from bs4 import BeautifulSoup, Tag

# Maximum number of classes retained in a class signature (readability cap).
_CLASS_SIGNATURE_CAP = 30

# Roles we recognise, in the order they should appear in output.
_LANDMARK_ROLES = ("header", "main", "aside", "footer")


def _slugify(value: str) -> str:
    """Convert arbitrary text into a kebab-case slug.

    Uses lowercase, strips non-alphanumeric runs to single hyphens,
    and trims leading/trailing hyphens. Returns empty string for empty
    or whitespace-only input.
    """
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value


def _collect_class_signature(container: Tag) -> list[str]:
    """Sorted unique class names appearing on top-level descendants.

    "Top-level" here means direct children of the container -- enough
    to form a stable fingerprint without exploding into every nested
    utility class. Capped at ``_CLASS_SIGNATURE_CAP``.
    """
    classes: set[str] = set()
    for child in container.find_all(recursive=False):
        for cls in child.get("class", []) or []:
            if cls:
                classes.add(cls)
    return sorted(classes)[:_CLASS_SIGNATURE_CAP]


def _derive_section_id(node: Tag, fallback_index: int, used: set[str]) -> str:
    """Pick a stable slug for a section.

    Priority order:
      1. ``id`` attribute on the node
      2. First heading text (h1-h6) inside the node, slugified
      3. First class on the node, slugified
      4. ``section-N`` where N is the 1-based index
    Disambiguates collisions by appending ``-2``, ``-3`` ...
    """
    candidate = ""

    node_id = node.get("id")
    if node_id:
        candidate = _slugify(node_id)

    if not candidate:
        heading = node.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        if heading and heading.get_text(strip=True):
            candidate = _slugify(heading.get_text(" ", strip=True))

    if not candidate:
        classes = node.get("class") or []
        if classes:
            candidate = _slugify(classes[0])

    if not candidate:
        candidate = f"section-{fallback_index}"

    # Disambiguate collisions deterministically.
    base = candidate
    suffix = 2
    while candidate in used:
        candidate = f"{base}-{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate


def _split_main_container(container: Tag) -> list[Tag]:
    """Split a main-like container into top-level section nodes.

    Prefers direct-child ``<section>`` elements. If none exist, falls
    back to direct-child ``<div>`` elements that carry at least one
    class (zero-class wrappers are usually layout shims and would
    fragment the output uselessly).
    """
    sections = [c for c in container.find_all("section", recursive=False)]
    if sections:
        return sections

    divs = [
        c for c in container.find_all("div", recursive=False)
        if c.get("class")
    ]
    return divs


def _make_record(
    node: Tag,
    role: str,
    fallback_index: int,
    used_ids: set[str],
) -> dict:
    """Build a single output record for a section node."""
    return {
        "section_id": _derive_section_id(node, fallback_index, used_ids),
        "semantic_role": role,
        "html_fragment": str(node),
        "class_signature": _collect_class_signature(node),
    }


def _page_level_landmark(soup: BeautifulSoup, tag_name: str) -> Tag | None:
    """Find the outermost page-level landmark of ``tag_name``.

    Many documents have nested ``<header>`` elements (e.g. an article
    header inside a section). Only landmarks whose ancestors are
    structural (``html``, ``body``, document root) count as page-level.
    """
    structural = {"html", "body", "[document]"}
    for candidate in soup.find_all(tag_name):
        parents = {p.name for p in candidate.parents}
        if parents.issubset(structural):
            return candidate
    return None


def _all_page_level(soup: BeautifulSoup, tag_name: str) -> list[Tag]:
    """All landmarks of ``tag_name`` whose parents are structural only."""
    structural = {"html", "body", "[document]"}
    out: list[Tag] = []
    for candidate in soup.find_all(tag_name):
        parents = {p.name for p in candidate.parents}
        if parents.issubset(structural):
            out.append(candidate)
    return out


def detect_sections(html: str) -> list[dict]:
    """Detect semantic sections in an HTML document.

    Returns a list of dicts shaped per the module docstring. Order
    follows landmark order: header(s) -> main contents -> aside(s) ->
    footer(s).
    """
    soup = BeautifulSoup(html, _PARSER)
    used_ids: set[str] = set()
    records: list[dict] = []
    counter = 1

    # Page-level <header>(s).
    for header in _all_page_level(soup, "header"):
        records.append(_make_record(header, "header", counter, used_ids))
        counter += 1

    # <main> -- split into child sections; if no <main>, treat <body> as main.
    main = _page_level_landmark(soup, "main")
    main_container = main if main is not None else soup.body
    if main_container is not None:
        for child in _split_main_container(main_container):
            records.append(_make_record(child, "main", counter, used_ids))
            counter += 1

    # Page-level <aside>(s).
    for aside in _all_page_level(soup, "aside"):
        records.append(_make_record(aside, "aside", counter, used_ids))
        counter += 1

    # Page-level <footer>(s).
    for footer in _all_page_level(soup, "footer"):
        records.append(_make_record(footer, "footer", counter, used_ids))
        counter += 1

    return records


def _read_input(path: str) -> str:
    """Read an HTML file from disk using UTF-8."""
    return Path(path).read_text(encoding="utf-8")


def main(argv: Iterable[str] | None = None) -> int:
    """CLI entry point: ``section_detector.py <html-file>``."""
    # Ensure UTF-8 output on Windows consoles (cp1252 default cannot
    # encode characters such as star glyphs that appear in markup).
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):  # pragma: no cover
        pass
    args = list(argv if argv is not None else sys.argv[1:])
    if len(args) != 1:
        sys.stderr.write(
            "usage: section_detector.py <html-file>\n"
        )
        return 2
    html = _read_input(args[0])
    sections = detect_sections(html)
    json.dump(sections, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
