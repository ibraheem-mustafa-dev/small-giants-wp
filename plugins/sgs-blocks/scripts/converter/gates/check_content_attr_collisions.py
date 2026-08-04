#!/usr/bin/env python3
"""check_content_attr_collisions.py — DB gate: attrs the content resolver cannot tell apart.

WHAT IT CATCHES
    The cloning converter resolves a draft BEM element to a target block attr via
    ``converter.db.db_lookup.content_attr_for_element()``
    (``plugins/sgs-blocks/scripts/converter/db/db_lookup.py:5346-5528``). Proven
    empirically (below) — NOT assumed — that resolver's tier-0 match key is:

        (block_slug, role, canonical_slot, derived_selector)

    When two-or-more content-bearing attrs on the SAME block share an IDENTICAL
    value on all three of ``role`` / ``canonical_slot`` / ``derived_selector``,
    the resolver cannot distinguish them from a draft element whose BEM token
    equals their shared ``canonical_slot``. It falls back to DB row order:

        "SELECT attr_name, canonical_slot, emit_shape, role, attr_type "
        "FROM block_attributes WHERE block_slug = ? AND role IN (...) "
        "ORDER BY rowid"                                    (db_lookup.py:5427-5430)
        ...
        if best_tier == 0:
            break  # rows are rowid-ordered; the first tier-0 hit is final.
                                                              (db_lookup.py:5527-5528)

    So the attr with the LOWEST ``id`` (SQLite ``rowid`` alias for this table's
    ``INTEGER PRIMARY KEY id`` column) wins, silently, every time — proven live on
    ``sgs/media``: ``imageUrl`` (role=image-object, canonical_slot=media,
    derived_selector=.sgs-media__media, id=414861) loses to ``videoPoster`` (same
    three values, id=414852) because 414852 < 414861. ``imageAlt`` — which declares
    ``alt_companion_attr='imageUrl'`` — is then orphaned (db_lookup.py:2609-2641
    documents the alt-companion side of this exact defect as a KNOWN, accepted
    per-attr fact; it does not resolve which attr wins the image element itself).

    ``lift_scalar_content()`` (``converter/resolvers/scalar_content.py:106-227``)
    has the SAME blind spot from the other direction: it iterates
    ``db_lookup.block_attrs(slug)`` (whose SELECT carries no ORDER BY — physical
    / insertion order, i.e. the same ``id`` order) and finds the first descendant
    matching each attr's own ``derived_selector`` independently — two attrs with
    an identical ``derived_selector`` both claim the SAME draft element.

ROUTING DIMENSIONS — PROVEN, NOT ASSUMED
    Confirmed by reading the resolvers rather than guessing:
      - ``block_attrs()`` (db_lookup.py:997-1020) hands every downstream content
        resolver exactly ``{role, canonical_slot, attr_type, derived_selector}``
        per attr — attr_type is fetched but never entered into a match test in
        either resolver below.
      - ``content_attr_for_element()`` (db_lookup.py:5346-5528) tier-0 match:
        ``canonical_slot == bem_element OR attr_name == bem_element`` (5517-5518).
        The ``attr_name == bem_element`` leg means an EXACT name match never
        collides — collision only fires when the draft's BEM token equals the
        attrs' shared ``canonical_slot`` and neither attr_name equals it, OR (the
        alias leg, tier-1, 5520-5521) when the token is a declared alias of that
        canonical_slot and no attr_name equals it either. attr_type is fetched
        (5427) but never compared (5516-5528, 5498-5500) — confirming it is NOT a
        routing dimension.
      - ``content_attrs_with_selector()`` (db_lookup.py:5046-5102) and
        ``lift_scalar_content()`` (scalar_content.py:154-190) both key purely on
        ``derived_selector`` (+ role, to gate WHICH lift path runs) — again no
        attr_type comparison in the match itself, only in the is_text/is_rating/
        is_media_object branch selection (scalar_content.py:164-172), which does
        not prevent two same-role same-type attrs racing for one element.

    A genuine TIER-0 exclusion DOES exist and this gate reproduces it faithfully
    (db_lookup.py:5481-5510, ``_is_tier_suffixed``): an attr whose name ends in a
    live ``modifier_suffixes(kind='breakpoint')`` value (Mobile/Tablet/Desktop)
    AND whose name-minus-suffix is ALSO a declared attr on the same block is
    EXCLUDED from the base-tier collision set — it only competes for the
    ``{base}{Suffix}`` tier-specific lookup once the base attr is already
    resolved, per rule 1 of that docstring. ``backgroundImage`` /
    ``backgroundImageTablet`` / ``backgroundImageMobile`` therefore do NOT
    collide with each other under this gate; only base-tier siblings do.

WHAT THE GATE DOES
    - Enumerates every content-bearing attr (``roles.classification =
      'content-bearing'``) with a non-NULL ``canonical_slot`` AND non-NULL
      ``derived_selector``, groups by (block_slug, role, canonical_slot,
      derived_selector), applies the SAME tier-suffix exclusion the resolver
      applies, and reports every group with 2+ SURVIVING (non-tier-excluded)
      members as a collision.
    - For each collision, names the WINNER — the surviving member with the
      lowest ``id`` — because that is exactly what ``content_attr_for_element``
      would emit (ORDER BY rowid, break on first tier-0 hit).
    - Splits collisions into GENUINE (default — no evidence found that the
      collision is by design) vs LEGITIMATE (a human has recorded, in
      ``content-attr-collision-exceptions.json`` next to this file, that a
      SPECIFIC (block_slug, role, canonical_slot, derived_selector) group is a
      confirmed in-progress legacy/current migration pair, with a reason and a
      decisions.md reference). See that file's header for why the split is
      human-curated rather than inferred: today's DB carries ZERO structural
      signal (no ``deprecated`` column on ``block_attributes``, every
      ``description`` cell in every group found is empty, and the block.json
      source files for these attrs carry no WP-native ``deprecated`` marker
      either) that would let a script tell "mid-migration, colliding by design"
      apart from "nobody noticed yet". Guessing that split from attr-name
      shape (e.g. "sounds like a rename") would be exactly the kind of
      unproven-cause inference this project's root-cause rule forbids.

DETECT ONLY
    Never writes to ``block_attributes`` or any classification column. Never
    invokes ``/sgs-update``. Advisory today (exit 0 always on ``--check``) —
    see the module docstring's CLI section.

CLI (run from plugins/sgs-blocks/scripts):
    python converter/gates/check_content_attr_collisions.py             # human report, exit 0
    python converter/gates/check_content_attr_collisions.py --check     # terse gate mode, exit 0 (advisory)
    python converter/gates/check_content_attr_collisions.py --json      # machine-readable, exit 0
    python converter/gates/check_content_attr_collisions.py --self-test # plant + prove it can fail
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_HERE = Path(__file__).resolve().parent          # scripts/converter/gates/
_SCRIPTS = _HERE.parents[1]                       # scripts/
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from converter.db import db_lookup  # noqa: E402  (path insert above must run first)

DEFAULT_DB = db_lookup.SGS_DB
EXCEPTIONS_FILE = _HERE / "content-attr-collision-exceptions.json"


# ---------------------------------------------------------------------------
# Data shapes
# ---------------------------------------------------------------------------

@dataclass
class AttrRow:
    id: int
    attr_name: str
    attr_type: str | None


@dataclass
class CollisionGroup:
    block_slug: str
    role: str
    canonical_slot: str
    derived_selector: str
    members: list[AttrRow]                 # surviving (non-tier-excluded), id-ascending
    tier_excluded: list[AttrRow] = field(default_factory=list)  # informational only
    legitimate: bool = False
    legitimate_reason: str | None = None
    legitimate_ref: str | None = None

    @property
    def winner(self) -> AttrRow:
        return self.members[0]  # already id-ascending; first tier-0 hit wins

    @property
    def losers(self) -> list[AttrRow]:
        return self.members[1:]


# ---------------------------------------------------------------------------
# Detection — mirrors content_attr_for_element's own tier-suffix exclusion
# (db_lookup.py:5481-5510) so this gate's notion of "collides" matches the
# resolver's, not a stricter or looser guess.
# ---------------------------------------------------------------------------

def _is_tier_suffixed(name: str, declared_names: set[str], breakpoint_suffixes: tuple[str, ...]) -> bool:
    for sfx in breakpoint_suffixes:
        if sfx and name.endswith(sfx) and len(name) > len(sfx):
            base = name[: -len(sfx)]
            if base and base in declared_names:
                return True
    return False


def _load_exceptions() -> list[dict]:
    """Human-curated legitimate-collision allowlist. Empty by default — see the
    module docstring for why this project has no automatic way to infer it."""
    if not EXCEPTIONS_FILE.exists():
        return []
    try:
        data = json.loads(EXCEPTIONS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return data.get("exceptions", []) if isinstance(data, dict) else []


def find_collisions(db_path: Path | str = DEFAULT_DB) -> list[CollisionGroup]:
    """Return every content-resolver collision group found in ``db_path``.

    Read-only. Groups content-bearing attrs (``roles.classification =
    'content-bearing'``) by (block_slug, role, canonical_slot, derived_selector)
    — the proven routing key — excludes tier-suffixed siblings the way the real
    resolver does, and returns groups where 2+ members still collide.
    """
    conn = sqlite3.connect(str(db_path))
    try:
        content_roles = [
            r[0] for r in conn.execute(
                "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
            ).fetchall()
        ]
        if not content_roles:
            return []

        breakpoint_suffixes = tuple(
            r[0] for r in conn.execute(
                "SELECT suffix FROM modifier_suffixes WHERE kind = 'breakpoint'"
            ).fetchall()
        )

        placeholders = ",".join("?" for _ in content_roles)
        rows = conn.execute(
            "SELECT id, block_slug, attr_name, attr_type, role, canonical_slot, derived_selector "
            f"FROM block_attributes WHERE role IN ({placeholders}) "
            "AND canonical_slot IS NOT NULL AND derived_selector IS NOT NULL "
            "ORDER BY block_slug, id",
            content_roles,
        ).fetchall()

        # All attr names per block (any role) — the exclusion test is role-agnostic,
        # mirroring db_lookup.py:5441-5446 exactly (a base sibling can carry a
        # DIFFERENT role to its tier-suffixed child and the exclusion must still fire).
        all_names_by_block: dict[str, set[str]] = {}
        for slug, name in conn.execute("SELECT block_slug, attr_name FROM block_attributes").fetchall():
            all_names_by_block.setdefault(slug, set()).add(name)
    finally:
        conn.close()

    groups: dict[tuple[str, str, str, str], list[AttrRow]] = {}
    for id_, block_slug, attr_name, attr_type, role, canonical_slot, derived_selector in rows:
        key = (block_slug, role, canonical_slot, derived_selector)
        groups.setdefault(key, []).append(AttrRow(id=id_, attr_name=attr_name, attr_type=attr_type))

    exceptions = _load_exceptions()

    def _match_exception(block_slug: str, role: str, canonical_slot: str, derived_selector: str) -> dict | None:
        for exc in exceptions:
            if (
                exc.get("block_slug") == block_slug
                and exc.get("role") == role
                and exc.get("canonical_slot") == canonical_slot
                and exc.get("derived_selector") == derived_selector
            ):
                return exc
        return None

    results: list[CollisionGroup] = []
    for (block_slug, role, canonical_slot, derived_selector), members in sorted(groups.items()):
        declared = all_names_by_block.get(block_slug, set())
        surviving: list[AttrRow] = []
        excluded: list[AttrRow] = []
        for m in members:
            (excluded if _is_tier_suffixed(m.attr_name, declared, breakpoint_suffixes) else surviving).append(m)

        if len(surviving) < 2:
            continue  # not a real collision — either unique or fully tier-resolved

        surviving.sort(key=lambda r: r.id)  # id-ascending = resolver's rowid order
        group = CollisionGroup(
            block_slug=block_slug, role=role, canonical_slot=canonical_slot,
            derived_selector=derived_selector, members=surviving, tier_excluded=excluded,
        )
        exc = _match_exception(block_slug, role, canonical_slot, derived_selector)
        if exc is not None:
            group.legitimate = True
            group.legitimate_reason = exc.get("reason")
            group.legitimate_ref = exc.get("decision_ref")
        results.append(group)

    return results


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def _report(groups: list[CollisionGroup]) -> str:
    genuine = [g for g in groups if not g.legitimate]
    legit = [g for g in groups if g.legitimate]

    lines: list[str] = []
    lines.append("[check-content-attr-collisions] "
                  f"{len(groups)} collision group(s) — {len(genuine)} GENUINE, {len(legit)} documented-LEGITIMATE.")
    lines.append("")

    if genuine:
        lines.append("GENUINE (no exceptions-file entry — unresolved, needs a human decision):")
        for g in genuine:
            attrs = ", ".join(f"{m.attr_name}(id={m.id})" for m in g.members)
            lines.append(f"  • {g.block_slug}  role={g.role}  canonical_slot={g.canonical_slot}")
            lines.append(f"      selector: {g.derived_selector}")
            lines.append(f"      attrs:    {attrs}")
            lines.append(f"      WINNER (lowest id, matches resolver's rowid order): {g.winner.attr_name}")
            lines.append(f"      orphaned: {', '.join(m.attr_name for m in g.losers)}")
            if g.tier_excluded:
                lines.append(
                    "      (tier-suffixed siblings excluded from this collision, not orphaned: "
                    + ", ".join(m.attr_name for m in g.tier_excluded) + ")"
                )
        lines.append("")

    if legit:
        lines.append("LEGITIMATE (documented in content-attr-collision-exceptions.json):")
        for g in legit:
            attrs = ", ".join(m.attr_name for m in g.members)
            lines.append(f"  • {g.block_slug}  {g.canonical_slot}  [{attrs}] — {g.legitimate_reason} "
                         f"({g.legitimate_ref})")
        lines.append("")

    if not groups:
        lines.append("All clear — no two content-bearing attrs on any block share "
                     "(role, canonical_slot, derived_selector).")

    return "\n".join(lines)


def _to_json(groups: list[CollisionGroup]) -> dict:
    return {
        "collision_count": len(groups),
        "genuine_count": sum(1 for g in groups if not g.legitimate),
        "legitimate_count": sum(1 for g in groups if g.legitimate),
        "groups": [
            {
                "block_slug": g.block_slug,
                "role": g.role,
                "canonical_slot": g.canonical_slot,
                "derived_selector": g.derived_selector,
                "legitimate": g.legitimate,
                "legitimate_reason": g.legitimate_reason,
                "legitimate_ref": g.legitimate_ref,
                "winner": g.winner.attr_name,
                "winner_id": g.winner.id,
                "losers": [m.attr_name for m in g.losers],
                "members": [{"attr_name": m.attr_name, "id": m.id, "attr_type": m.attr_type} for m in g.members],
                "tier_excluded": [m.attr_name for m in g.tier_excluded],
            }
            for g in groups
        ],
    }


# ---------------------------------------------------------------------------
# Self-test — plants a synthetic on-disk DB, CONFIRMS the plant landed before
# running the detector against it, then asserts positive + negative controls.
# ---------------------------------------------------------------------------

_SCHEMA = """
CREATE TABLE block_attributes (
    id INTEGER PRIMARY KEY,
    block_slug TEXT NOT NULL,
    attr_name TEXT NOT NULL,
    attr_type TEXT NOT NULL,
    canonical_slot TEXT,
    role TEXT,
    derived_selector TEXT
);
CREATE TABLE roles (
    role_name TEXT PRIMARY KEY,
    classification TEXT NOT NULL
);
CREATE TABLE modifier_suffixes (
    suffix TEXT PRIMARY KEY,
    kind TEXT NOT NULL
);
"""


def _self_test() -> int:
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "self-test.db"
        conn = sqlite3.connect(str(db_path))
        conn.executescript(_SCHEMA)
        conn.executemany(
            "INSERT INTO roles (role_name, classification) VALUES (?, ?)",
            [("image-object", "content-bearing"), ("text-content", "content-bearing"), ("layout", "styling-behaviour")],
        )
        conn.executemany(
            "INSERT INTO modifier_suffixes (suffix, kind) VALUES (?, ?)",
            [("Mobile", "breakpoint"), ("Tablet", "breakpoint"), ("Desktop", "breakpoint")],
        )
        # Case 1 (POSITIVE — plant the proven sgs/media defect shape): two
        # image-object attrs, same canonical_slot + derived_selector, no tier
        # suffix relationship. videoPoster gets the LOWER id (planted first),
        # mirroring the real DB's ordering, so it must be reported as winner.
        conn.executemany(
            "INSERT INTO block_attributes (id, block_slug, attr_name, attr_type, canonical_slot, role, derived_selector) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                (100, "fixture/collision-media", "videoPoster", "object", "media", "image-object", ".sgs-x__media"),
                (101, "fixture/collision-media", "imageUrl", "object", "media", "image-object", ".sgs-x__media"),
                # Case 2 (NEGATIVE CONTROL — tier siblings must NOT collide): a base
                # attr plus its Mobile/Tablet siblings sharing the same selector.
                (200, "fixture/collision-tiers", "backgroundImage", "object", "backgroundMedia", "image-object", ".sgs-y__bg"),
                (201, "fixture/collision-tiers", "backgroundImageMobile", "object", "backgroundMedia", "image-object", ".sgs-y__bg"),
                (202, "fixture/collision-tiers", "backgroundImageTablet", "object", "backgroundMedia", "image-object", ".sgs-y__bg"),
                # Case 3 (NEGATIVE CONTROL — different selector, no collision):
                (300, "fixture/collision-unique", "heading", "string", "heading", "text-content", ".sgs-z__heading"),
                (301, "fixture/collision-unique", "subheading", "string", "subheading", "text-content", ".sgs-z__subheading"),
                # Case 4 (NEGATIVE CONTROL — non-content role must not enter the pool):
                (400, "fixture/collision-styling", "gap", "string", "layout", "layout", ".sgs-w__layout"),
                (401, "fixture/collision-styling", "align", "string", "layout", "layout", ".sgs-w__layout"),
            ],
        )
        conn.commit()
        conn.close()

        # --- Confirm the plant landed on disk BEFORE trusting the detector ---
        verify_conn = sqlite3.connect(str(db_path))
        planted_count = verify_conn.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0]
        planted_media = verify_conn.execute(
            "SELECT attr_name, id FROM block_attributes WHERE block_slug = 'fixture/collision-media' ORDER BY id"
        ).fetchall()
        verify_conn.close()
        plant_ok = planted_count == 9 and planted_media == [("videoPoster", 100), ("imageUrl", 101)]
        print(f"{'PASS' if plant_ok else 'FAIL'}  plant landed on disk "
              f"({planted_count} rows, fixture/collision-media={planted_media})")
        ok = ok and plant_ok
        if not plant_ok:
            print("SELF-TEST ABORTED — the plant itself did not land; the assertions below would be meaningless.")
            return 1

        # --- Run the real detector against the planted DB ---
        groups = find_collisions(db_path)
        by_block = {g.block_slug: g for g in groups}

        cases = [
            ("POSITIVE — fixture/collision-media videoPoster/imageUrl collide, videoPoster (id 100) wins",
             "fixture/collision-media" in by_block
             and [m.attr_name for m in by_block["fixture/collision-media"].members] == ["videoPoster", "imageUrl"]
             and by_block["fixture/collision-media"].winner.attr_name == "videoPoster"
             and [m.attr_name for m in by_block["fixture/collision-media"].losers] == ["imageUrl"]),
            ("NEGATIVE CONTROL — tier siblings (Mobile/Tablet) excluded, no collision reported",
             "fixture/collision-tiers" not in by_block),
            ("NEGATIVE CONTROL — distinct selectors never collide",
             "fixture/collision-unique" not in by_block),
            ("NEGATIVE CONTROL — non-content-bearing role excluded from the pool",
             "fixture/collision-styling" not in by_block),
        ]
        for name, passed in cases:
            print(f"{'PASS' if passed else 'FAIL'}  {name}")
            ok = ok and passed

        # --- Exceptions-file wiring: a documented exception must be reported
        # as legitimate rather than genuine (prove the OFF switch works too) ---
        exc_path = Path(tmp) / "exceptions.json"
        exc_path.write_text(json.dumps({
            "exceptions": [{
                "block_slug": "fixture/collision-media", "role": "image-object",
                "canonical_slot": "media", "derived_selector": ".sgs-x__media",
                "reason": "self-test exception", "decision_ref": "D-TEST",
            }]
        }), encoding="utf-8")
        global EXCEPTIONS_FILE
        saved = EXCEPTIONS_FILE
        EXCEPTIONS_FILE = exc_path
        try:
            groups2 = find_collisions(db_path)
            marked = next((g for g in groups2 if g.block_slug == "fixture/collision-media"), None)
            passed = marked is not None and marked.legitimate and marked.legitimate_ref == "D-TEST"
        finally:
            EXCEPTIONS_FILE = saved
        print(f"{'PASS' if passed else 'FAIL'}  exceptions-file entry reclassifies a group as LEGITIMATE")
        ok = ok and passed

    print()
    if ok:
        print("Self-test PASSED — the gate detects the proven collision shape, respects the tier-suffix "
              "exclusion, ignores non-content roles, and honours a documented exception.")
    else:
        print("SELF-TEST FAILED — do not trust this gate until it is fixed.")
    return 0 if ok else 1


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = parser.add_mutually_exclusive_group()
    g.add_argument("--check", action="store_true", help="terse gate-style output; advisory, always exit 0")
    g.add_argument("--json", action="store_true", help="machine-readable JSON to stdout")
    g.add_argument("--self-test", action="store_true", help="plant + prove the gate can fail")
    args = parser.parse_args(argv)

    if args.self_test:
        return _self_test()

    groups = find_collisions()

    if args.json:
        print(json.dumps(_to_json(groups), indent=2))
        return 0  # advisory

    if args.check:
        genuine = sum(1 for g in groups if not g.legitimate)
        legit = sum(1 for g in groups if g.legitimate)
        print(f"[check-content-attr-collisions] {genuine} genuine, {legit} documented-legitimate "
              f"(advisory — exit 0).")
        return 0  # advisory

    print(_report(groups))
    return 0  # advisory


if __name__ == "__main__":
    raise SystemExit(main())
