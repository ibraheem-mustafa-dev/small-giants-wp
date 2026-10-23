#!/usr/bin/env python3
"""Shared, zero-dependency utilities for the SGS clone scripts.

Deliberately tiny + stdlib-only so BOTH the Spec 33 theme-extractor (``theme-extractor/extract.py``)
and whatever re-checks its freshness stamp import the SAME functions. The FR-33-12 freshness gate hashes the extractor-consumed draft CSS on
both sides (the extractor stamps it, the freshness check re-checks it) — a single source
of truth is therefore a CORRECTNESS requirement: a duplicated regex could let the two
hashes drift apart silently and either wrongly pass or wrongly fail the gate.
"""
from __future__ import annotations

import hashlib
import re

__version__ = "1.0"

_STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.DOTALL | re.I)


def extract_css(html: str) -> str:
    """Concatenate every inline ``<style>`` block (SGS drafts are single-file inline CSS)."""
    return "\n".join(_STYLE_BLOCK_RE.findall(html))


def css_sha256(css: str) -> str:
    """Stable, cross-process sha256 of a draft-CSS string — the FR-33-12 freshness key.

    ``hashlib.sha256`` (not the built-in ``hash()``, which is per-process salted) so the
    value the extractor embeds and the value the freshness check re-computes always match.
    """
    return hashlib.sha256(css.encode("utf-8")).hexdigest()


def draft_css_sha256(html: str) -> str:
    """sha256 of a draft's inline CSS, extracted then hashed (the value the gate re-checks)."""
    return css_sha256(extract_css(html))


# --------------------------------------------------------------------------- Claude Design drafts
# A Claude Design draft keeps its real design outside its <style> block: in inline ``style=`` /
# ``style-hover=`` attributes, in the ``text/x-dc`` script (accent sets, runtime data).
# ``draft_css_sha256`` is blind to both, so a changed inline colour would leave the FR-33-12 key identical. ``draft_source_sha256`` hashes them as well, for those drafts
# only; static drafts return None and keep their existing key, snapshot bytes unchanged.

# Content signal, not a filename. The pattern that recognises a DSL draft by its markup.
_DSL_DRAFT_RE = re.compile(r"<x-dc\b|\bdata-dc-script\b|<sc-(?:for|if)\b", re.IGNORECASE)
_DC_SCRIPT_RE = re.compile(r"<script\b[^>]*\btype\s*=\s*[\"']text/x-dc[\"']", re.IGNORECASE)
# ``style="…"`` / ``style-hover="…"`` (either quote), preceded by whitespace so ``data-style=`` and
# ``x-style=`` never match. ``style-hover`` is listed first so it is not read as ``style``.
_INLINE_STYLE_ATTR_RE = re.compile(
    r"(?<=\s)(style-hover|style)\s*=\s*(?:\"([^\"]*)\"|'([^']*)')", re.IGNORECASE
)


def is_part_draft(snap: dict, draft_path) -> bool:
    """True when ``snap`` records the draft it was extracted from and ``draft_path`` is a different file.

    Spec 33 runs on a client's source drafts only (the site-wide homepage draft). A page or component
    draft of the same client inherits the saved snapshot. A snapshot with no recorded source (one made
    before ``source_draft`` existed) reports False, so it is checked against every draft as before.
    """
    from pathlib import Path

    recorded = (snap.get("_sgsExtractor") or {}).get("source_draft")
    return bool(recorded) and recorded != Path(draft_path).name


def is_claude_design_draft(html: str) -> bool:
    """True when ``html`` is a Claude Design (DSL) draft, by content signal."""
    return bool(_DSL_DRAFT_RE.search(html))


def _normalise_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


MANIFEST_NAME = "MANIFEST.json"


def is_source_path(path: str) -> bool:
    """True for a MANIFEST file path the freshness key covers: a draft (``*.html``) or ``tokens/*.css``.

    ``scripts/computed-route/lib/snapshot-freshness.mjs`` applies the same rule.
    """
    lower = path.replace("\\", "/").lower()
    return lower.endswith(".html") or (lower.startswith("tokens/") and lower.endswith(".css"))


def manifest_source_hashes(folder) -> "dict[str, str] | None":
    """``{path: sha256}`` for the drafts and ``tokens/*.css`` a Spec 48A export's ``MANIFEST.json`` lists.

    None when ``folder`` holds no ``MANIFEST.json`` (a static or pre-48A draft). The hashes are the
    MANIFEST's own, so a re-export that changes a draft or a token file changes them and the README
    never can (C4: the README is not a design input).
    """
    import json
    from pathlib import Path

    if folder is None:
        return None
    manifest = Path(folder) / MANIFEST_NAME
    if not manifest.is_file():
        return None
    files = json.loads(manifest.read_text(encoding="utf-8")).get("files") or []
    return {f["path"]: f["sha256"] for f in files
            if isinstance(f, dict) and f.get("path") and f.get("sha256") and is_source_path(f["path"])}


def draft_source_sha256(html: str, folder=None) -> "str | None":
    """The FR-33-12 source key of a Claude Design draft, or None for any other draft.

    For a Spec 48A export (``folder`` holds ``MANIFEST.json``) it is the sha256 over the MANIFEST's
    hashes of the drafts and ``tokens/*.css``, sorted by path. For any other Claude Design draft it is the
    sha256 over, in this fixed order and with line endings normalised (so CRLF and LF checkouts agree):
    the ``<style>`` CSS, every ``style`` / ``style-hover`` attribute value of the template in document
    order (each tagged with its attribute name), and the whole ``text/x-dc`` script from its opening tag
    to the end of the file. The README is never hashed (C4).
    """
    hashes = manifest_source_hashes(folder)
    if hashes:
        return hashlib.sha256("\n".join(f"{k}={hashes[k]}" for k in sorted(hashes)).encode("utf-8")).hexdigest()
    if not is_claude_design_draft(html):
        return None
    html = _normalise_newlines(html)
    marker = _DC_SCRIPT_RE.search(html)
    template = html[: marker.start()] if marker else html
    script = html[marker.start():] if marker else ""
    attrs = [
        f"{m.group(1).lower()}={m.group(2) if m.group(2) is not None else m.group(3)}"
        for m in _INLINE_STYLE_ATTR_RE.finditer(_STYLE_BLOCK_RE.sub("", template))
    ]
    parts = [
        "css:" + extract_css(html),
        "attrs:" + "\n".join(attrs),
        "script:" + script,
    ]
    return hashlib.sha256("\x1e".join(parts).encode("utf-8")).hexdigest()
