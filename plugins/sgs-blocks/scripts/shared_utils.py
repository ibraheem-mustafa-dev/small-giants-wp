#!/usr/bin/env python3
"""Shared, zero-dependency utilities for the SGS clone scripts.

Deliberately tiny + stdlib-only so BOTH the orchestrator (``sgs-clone-orchestrator.py``)
and the Spec 33 theme-extractor (``theme-extractor/extract.py``) import the SAME
functions. The FR-33-12 freshness gate hashes the extractor-consumed draft CSS on
both sides (the extractor stamps it, the orchestrator re-checks it) — a single source
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
    value the extractor embeds and the value the orchestrator re-computes always match.
    """
    return hashlib.sha256(css.encode("utf-8")).hexdigest()


def draft_css_sha256(html: str) -> str:
    """sha256 of a draft's inline CSS, extracted then hashed (the value the gate re-checks)."""
    return css_sha256(extract_css(html))
