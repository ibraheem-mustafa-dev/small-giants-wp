#!/usr/bin/env python3
"""oracle.golden_expectations — does a fixture's GOLDEN expect any rendered text?

Spec ref: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §7b (the false-win
guards) + §13.3 FR-31-2.2 (the content-bearing role allowlist).

WHY THIS EXISTS
---------------
The F3 empty-section and height-parity guards (oracle/guards.py 1 and 4) were
written against an ASSUMPTION: that every converted section renders visible
text, so an empty render is a false-win. That assumption does not hold for the
fixture corpus. Several conformance fixtures legitimately convert to a
CONTENT-LESS block — ``sgs-info-box`` converts to a single self-closing
``<!-- wp:sgs/info-box {...} /-->`` carrying only box CSS, and the CURRENT
golden (``goldens/sgs-info-box.golden.json``, seeded D278 from the
LANDED-verified engine with a real canary deploy behind it) records exactly
that markup.

So the guards fired on 18 observations that were byte-consistent with their own
baseline, and because a section-level guard voids EVERY cell in its section,
that inflated into 87 GUARD-FAIL cells. Those were harness artefacts being read
as converter defects.

THE FIX (and what it deliberately does NOT do)
-----------------------------------------------
The guard's reference becomes the GOLDEN, not an assumption:

  golden expects text + live renders empty  -> STILL A FAILURE (real regression)
  golden expects no text + live renders empty -> consistent with baseline, N/A
  golden expects no text + live renders text  -> surfaced (live EXCEEDS golden)

This is NOT "skip the guard when it's inconvenient". A fixture whose golden
carries content keeps the full guard — that is the case the guard was built
for, and it must still fail. Only the expected-empty case is reclassified, and
only because the baseline itself says empty is correct there.

HOW "expects text" IS DECIDED (three signals, DB-first)
--------------------------------------------------------
A golden's ``block_markup`` expects rendered text when ANY of:

  (a) it contains more than one ``<!-- wp:`` block  -> child InnerBlocks, whose
      content renders inside the parent;
  (b) it contains raw non-whitespace text OUTSIDE the block comments  -> literal
      markup content;
  (c) any emitted block sets an attribute whose DB ``role`` is in the
      content-bearing allowlist (FR-31-2.2: text-content / identity /
      image-object / content / rating) to a non-empty value.

(c) is queried from ``block_attributes`` — never a hardcoded attr-name list
(R-31-1). A self-closing ``sgs/heading {"content":"Hi"}`` therefore correctly
counts as expecting text, even though it is a single self-closing block.

FAIL-OPEN, DELIBERATELY
-----------------------
If no golden exists for a fixture, or the DB is unreachable, this returns
``expects_text=True`` (the STRICT setting) with a stated reason. An unknown
expectation must never be the lenient one — that would let a genuine empty-render
regression through on any fixture that simply lacks a golden.
"""
from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_SCRIPTS_DIR = _HERE.parent
_GOLDENS_DIR = _SCRIPTS_DIR / "tests" / "fixtures" / "conformance" / "goldens"
_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# FR-31-2.2 content-bearing role allowlist — the gate INTO the content walk.
_CONTENT_ROLES = ("text-content", "identity", "image-object", "content", "rating")

_BLOCK_COMMENT_RE = re.compile(r"<!--\s*/?\s*wp:([a-z0-9-]+/[a-z0-9-]+)([^>]*?)/?-->")
_OPEN_BLOCK_RE = re.compile(r"<!--\s*wp:")


@dataclass(frozen=True)
class GoldenExpectation:
    """What a fixture's golden says the clone should render."""

    fixture: str
    expects_text: bool
    reason: str
    golden_found: bool


def _content_attr_names(db_path: Path = _DB_PATH) -> dict[str, set[str]]:
    """{block_slug: {attr names whose role is content-bearing}} from the DB."""
    if not db_path.exists():
        return {}
    out: dict[str, set[str]] = {}
    try:
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            placeholders = ",".join("?" for _ in _CONTENT_ROLES)
            rows = con.execute(
                f"SELECT block_slug, attr_name FROM block_attributes "
                f"WHERE role IN ({placeholders})",
                _CONTENT_ROLES,
            ).fetchall()
        finally:
            con.close()
    except sqlite3.Error:
        return {}
    for slug, attr in rows:
        out.setdefault(slug, set()).add(attr)
    return out


def _markup_expects_text(markup: str, content_attrs: dict[str, set[str]]) -> tuple[bool, str]:
    """Apply the three signals to one golden's block_markup."""
    if not markup or not markup.strip():
        return False, "golden block_markup is empty"

    # (a) more than one opening block comment -> child InnerBlocks present.
    if len(_OPEN_BLOCK_RE.findall(markup)) > 1:
        return True, "golden contains child InnerBlocks (>1 wp: block)"

    # (b) raw non-whitespace text outside the block comments.
    outside = _BLOCK_COMMENT_RE.sub("", markup)
    outside = re.sub(r"<[^>]+>", "", outside)
    if outside.strip():
        return True, "golden contains raw text outside the block comments"

    # (c) any content-role attribute set to a non-empty value.
    for match in _BLOCK_COMMENT_RE.finditer(markup):
        slug, attr_blob = match.group(1), match.group(2).strip()
        if not attr_blob:
            continue
        start = attr_blob.find("{")
        if start == -1:
            continue
        try:
            attrs = json.loads(attr_blob[start:])
        except json.JSONDecodeError:
            continue
        if not isinstance(attrs, dict):
            continue
        wanted = content_attrs.get(f"sgs/{slug.split('/')[-1]}") or content_attrs.get(slug) or set()
        for key, value in attrs.items():
            if key in wanted and value not in (None, "", [], {}):
                return True, f"golden sets content-role attr {slug}.{key}"

    return False, "golden emits no child blocks, no raw text and no content-role attrs"


def expectation_for(fixture_stem: str, goldens_dir: Path = _GOLDENS_DIR) -> GoldenExpectation:
    """Resolve whether ``fixture_stem``'s golden expects any rendered text.

    Fails STRICT (expects_text=True) when the golden is absent or unreadable —
    an unknown expectation must never be the lenient one.
    """
    path = goldens_dir / f"{fixture_stem}.golden.json"
    if not path.exists():
        return GoldenExpectation(
            fixture=fixture_stem,
            expects_text=True,
            reason=(
                "no golden found — defaulting to STRICT (expects text), so a real "
                "empty-render regression cannot hide behind a missing baseline"
            ),
            golden_found=False,
        )
    try:
        golden = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return GoldenExpectation(
            fixture=fixture_stem,
            expects_text=True,
            reason=f"golden unreadable ({exc}) — defaulting to STRICT",
            golden_found=False,
        )

    expects, why = _markup_expects_text(
        golden.get("block_markup") or "", _content_attr_names()
    )
    return GoldenExpectation(
        fixture=fixture_stem, expects_text=expects, reason=why, golden_found=True,
    )


if __name__ == "__main__":  # pragma: no cover - manual inspection helper
    import sys

    sys.stdout.reconfigure(encoding="utf-8")
    stems = sys.argv[1:] or sorted(
        p.name[: -len(".golden.json")] for p in _GOLDENS_DIR.glob("*.golden.json")
    )
    for stem in stems:
        e = expectation_for(stem)
        flag = "TEXT" if e.expects_text else "EMPTY"
        print(f"  [{flag:5s}] {stem:28s} {e.reason}")
