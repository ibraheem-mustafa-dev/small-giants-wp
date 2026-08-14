#!/usr/bin/env python3
"""Regenerate the D-number index at the top of memory/decisions-archive.md.

The archive mixes two historical heading formats -- '## D<N> - title' and the
older bold-inline '**D<N> - title.**' -- and a tool that only recognises one
of them (as the original sweep script did) silently treats 82% of the archive
as if it doesn't exist. This script reads both formats and writes a flat,
sorted, grep-friendly index block right after the file's intro paragraph.

Usage: python .claude/scripts/build-archive-index.py
Run from the repo root (small-giants-wp/). Idempotent -- replaces any
previously generated index block rather than appending a second one.
"""
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_PATH = REPO_ROOT / ".claude" / "memory" / "decisions-archive.md"

PAT_HEADING = re.compile(r"(?m)^## D(\d+)(\([^)\n]*\))?\s*[—-]\s*([^\n]+?)\s*$")
PAT_BOLD = re.compile(r"(?m)^\*\*D(\d+)(\([^)\n]*\))?\s*[—-]\s*([^\n*]+?)\*\*")

INDEX_START = "## Index — every D-number archived here, sorted ascending"
INDEX_END_MARKER = "\n---\n"


def extract_entries(text):
    entries = {}
    for m in PAT_HEADING.finditer(text):
        n = int(m.group(1))
        entries.setdefault(n, m.group(3).strip()[:80])
    for m in PAT_BOLD.finditer(text):
        n = int(m.group(1))
        entries.setdefault(n, m.group(3).strip().rstrip(".")[:80])
    return entries


def strip_existing_index(text):
    """Remove a previously generated index block, if present, so re-running is idempotent."""
    if INDEX_START not in text:
        return text
    start = text.index(INDEX_START)
    # the index block always ends right before the first '---' separator that follows it
    end = text.index(INDEX_END_MARKER, start)
    return text[:start] + text[end + 1:]


def main():
    raw = ARCHIVE_PATH.read_bytes()
    # Normalise to LF for all string processing regardless of what's currently
    # on disk (CRLF vs LF) -- avoids marker searches silently failing depending
    # on line-ending state. Converted back to CRLF only at the final write.
    text = raw.decode("utf-8").replace("\r\n", "\n")

    # Build the index from the body ONLY (skip a stale index block if present,
    # so old index entries can't shadow real headings that moved).
    body_for_scan = strip_existing_index(text)
    entries = extract_entries(body_for_scan)
    nums = sorted(entries.keys())

    lines = [f"- D{n} — {entries[n]}" for n in nums]
    index_text = "\n".join(lines)

    block = (
        f"\n{INDEX_START}\n\n"
        "Covers both legacy `**D<N>` and `## D<N>` heading formats in this file. Check here "
        "before hunting through thousands of lines chronologically: grep the number below for "
        "a one-line title, then grep that same number as a heading (`^## D<N>` or `^\\*\\*D<N>`) "
        "to jump to the full entry. Regenerate with "
        "`python .claude/scripts/build-archive-index.py` after archiving more entries.\n\n"
        + index_text + "\n\n"
    )

    text_without_index = strip_existing_index(text)
    marker_pos = text_without_index.index(INDEX_END_MARKER)
    new_text = text_without_index[:marker_pos] + block + text_without_index[marker_pos:]

    # decisions-archive.md is pure CRLF -- preserve that convention.
    new_text_crlf = new_text.replace("\r\n", "\n").replace("\n", "\r\n")
    ARCHIVE_PATH.write_bytes(new_text_crlf.encode("utf-8"))

    print(f"Indexed {len(nums)} D-numbers (D{nums[0]}-D{nums[-1]}).")
    print(f"decisions-archive.md: {len(raw):,} -> {len(new_text_crlf.encode('utf-8')):,} bytes")


if __name__ == "__main__":
    main()
