"""Audit: block.json declared `role` vs the DB-seeded role — the FR-31-2.1a tracking gate.

WHY (2026-07-16, qc-council). FR-31-2.1a (Spec 31 §13.3, D258) says an attr's role must
come from CODE or an explicit DECLARATION, never from parsing the identifier NAME. The
seeder `behavioural-analyser/assign-canonical.py::detect_role_from_block_json` currently
does the forbidden thing — it derives role from an attr-NAME regex (`_ATTR_NAME_RULES`)
and IGNORES the authored `"role"` key in block.json. That is a live FR-31-2.1a violation.

It is INERT, not active: the name-regex produces CORRECT roles today (measured — the 9
attrs below are all correctly upgraded from the bulk `content` marker to their specific
role; the converter suite is green). A naive "read the declaration first" fix would
REGRESS all 9, because every declaration is the identical bulk value `"role": "content"`
(the generic catch-all the pipeline deliberately upgrades AWAY from) — `sgs/button.url`
would take the button's label text as its href. So the closure is a SEQUENCED refactor,
not a one-shot flip (Spec 31 FR-31-2.1a closure note + parking P-FR-31-2.1A-CLOSURE).

⛔ CRITICAL (2026-07-16): the block.json `"role"` key this audit reads is WP 7.0's
`contentOnly` PATTERN-EDITABILITY marker (WP core's own attribute property; parking
`P-WP7-PLATFORM-ALIGNMENT` item 1) — an attr WITHOUT `"role":"content"` is non-editable
inside a WP 7.0 pattern, LOCKING client editing. It is NOT the converter's role
vocabulary. So this audit compares TWO DIFFERENT vocabularies that collide on the key
name `role`: WP-core `content` (editability) vs the SGS-DB-derived converter role
(link-href/image-object/...). The DANGER bucket is NOT "declarations to correct" — those
attrs MUST keep `"role":"content"` for client editing. DANGER = "attrs whose SGS converter
role is more specific than WP core's content marker; they need an SGS-OWNED role channel,
never a change to WP core's `role`".

This script MEASURES the gap so the FR-31-2.1a closure is tracked. It buckets every
attr carrying a WP-core `role`:
  AGREE   — WP-core role == DB role
  NULL    — no DB role yet (mostly inert: no selector)
  BENIGN  — db=text-content, WP-core=content; lift-equivalent
  DANGER  — db has a SPECIFIC converter role WP core does not model (needs SGS channel)

CLOSURE SEQUENCE (do NOT flip the reader — WP-core `"role":"content"` stays put):
  1. Add an SGS-OWNED per-attr role channel (e.g. block.json `supports.sgs.attrRoles`)
     declaring the SPECIFIC converter role — parallel to the array-item `role` channel
     (`items.properties.<field>.role`, FR-31-2.5). WP core's `"role":"content"` untouched.
  2. Seeder reads that channel COLUMN-FIRST-ELSE-name-regex-fallback (D285 shape); wire
     an audit `--check` (SGS-channel present for every DANGER attr) to prebuild.
  3. Only once every derived role is declared there + the audit proves SGS-channel ==
     seeded role: flip the seeder to channel-first + DELETE `_ATTR_NAME_RULES`. Live-verify.

Usage:
    python audit-declared-vs-seeded-roles.py            # report
    python audit-declared-vs-seeded-roles.py --check    # exit 1 if any DANGER conflict
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SRC_BLOCKS = Path(__file__).resolve().parent.parent / "src" / "blocks"
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Roles that DOWNSTREAM code branches on by exact value (converter/walk.py) — demoting
# any of these to the generic `content` marker silently breaks identity resolution.
DANGER_ROLES = {"link-href", "url-href", "image-object", "image-alt", "rating", "icon-slug"}
# text-content and content are lift-equivalent (scalar_content.py:164 / walk.py:261).
BENIGN_TARGETS = {"text-content", "content"}


def collect() -> list[tuple[str, str, str, str | None]]:
    con = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
    try:
        out = []
        for p in sorted(SRC_BLOCKS.rglob("block.json")):
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            slug = "sgs/" + p.parent.name
            for attr, spec in (data.get("attributes") or {}).items():
                if isinstance(spec, dict) and "role" in spec:
                    row = con.execute(
                        "SELECT role FROM block_attributes WHERE block_slug=? AND attr_name=?",
                        (slug, attr),
                    ).fetchone()
                    out.append((slug, attr, spec["role"], row[0] if row else None))
        return out
    finally:
        con.close()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="exit 1 if any DANGER conflict remains (step-2 gate; not yet wired)")
    args = ap.parse_args()

    if not SGS_DB.exists() or SGS_DB.stat().st_size == 0:
        print(f"ERROR: framework DB missing/empty: {SGS_DB}", file=sys.stderr)
        return 2

    rows = collect()
    agree = [r for r in rows if r[2] == r[3]]
    null = [r for r in rows if r[3] is None]
    danger = [r for r in rows if r[3] in DANGER_ROLES and r[2] != r[3]]
    benign = [r for r in rows if r[3] in BENIGN_TARGETS and r[2] != r[3]]

    print(f"declared-role attrs: {len(rows)}")
    print(f"  AGREE (decl==db)         : {len(agree)}")
    print(f"  NULL in db (would seed)  : {len(null)}")
    print(f"  BENIGN conflict (safe)   : {len(benign)}")
    print(f"  DANGER conflict (BREAKS) : {len(danger)}")
    if danger:
        print("\n  DANGER — SGS converter role is more specific than WP core's `content` marker.")
        print("  KEEP block.json `\"role\":\"content\"` (WP 7.0 pattern-editability); declare the")
        print("  SGS converter role in a SEPARATE SGS-owned channel (supports.sgs.attrRoles):")
        for slug, attr, decl, dbrole in danger:
            print(f"      {slug}.{attr}: wp-core-role={decl}  sgs-converter-role={dbrole}")

    print("\nFR-31-2.1a closure: add supports.sgs.attrRoles (SGS channel) declaring the SGS")
    print("converter role; seeder reads channel-first-else-name-regex; then delete the regex.")
    print("Do NOT change WP core's `\"role\":\"content\"` — that is client pattern-editability.")

    if args.check and danger:
        print(f"\nFAIL: {len(danger)} attr(s) lack an SGS-owned converter-role declaration.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
