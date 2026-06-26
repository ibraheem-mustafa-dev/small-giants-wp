"""draft_oracle.py — independent draft reader for the LANDED gate (Stage 3 §7).

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §7.

Reads the RAW draft HTML directly (BeautifulSoup, no engine involvement).
This is the non-circular oracle (STOP-3): the oracle must not call any part of
the conversion engine — its only input is the fixture file on disk.

No block or slot string literals (scanned by gates/no_slug_literal).
"""
from __future__ import annotations

from bs4 import BeautifulSoup


def read_draft_field(fixture_path: str, derived_selector: str) -> str:
    """Return the text content of the first element matching derived_selector.

    Reads fixture_path from disk, parses with BeautifulSoup, selects the first
    element matching the CSS-style derived_selector, and returns its stripped
    text content.  Returns "" if no element matches.

    This function is intentionally isolated from the conversion engine — it
    reads the draft directly so that a LANDED test can compare engine output
    against the source, not against another engine path (STOP-3).

    Args:
        fixture_path: Absolute or relative path to the draft HTML fixture file.
        derived_selector: A CSS selector string (passed to bs4 .select_one()).

    Returns:
        Stripped text of the matched element, or "" on no match.
    """
    with open(fixture_path, encoding="utf-8") as fh:
        soup = BeautifulSoup(fh.read(), "html.parser")
    node = soup.select_one(derived_selector)
    if node is None:
        return ""
    return node.get_text(strip=True)
