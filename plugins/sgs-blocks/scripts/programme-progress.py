#!/usr/bin/env python3
"""programme-progress.py — burn-down reporter for the tier-object migration programme.

WHY THIS EXISTS (LEDGER.md "COLOUR-GOLDEN / TOOLING TRACK", 2026-08-24, council
finding #2): this repo runs 61 build gates and every one of them detects
REGRESSION. Not one of them measures PROGRESS towards finishing the flat-scalar
-> tier-object migration (`<prop>` / `<prop>Tablet` / `<prop>Mobile` -> one
`<prop>: {desktop,tablet,mobile}` object; Spec 35 / D549 / D554 / D571; the fix
tool is `plugins/sgs-blocks/scripts/migrate-tier-object.py`). A programme with
regression detection and no completion metric cannot terminate. This script is
that missing metric: run it, watch the "non-conforming pairs" count fall, stop
when it hits zero.

============================================================================
THE DENOMINATOR — read this before trusting any number below. Established by
QUERYING the DB (never reasoned to), cross-checked against two independent
documents, and stated here so a reviewer can check the reasoning without
re-deriving it.
============================================================================

STEP 1 — the naive approach was tried FIRST and is DEMONSTRABLY WRONG.
`block_attributes.css_tier` is NULL on 3,136 of 3,166 rows (99.1%). Dividing by
this column would report "~1% conformance" — read as near-total failure, when
the true state is nowhere near that. Why it is wrong, confirmed by reading
Spec 31 §3.A step 2 and §4's DB-column-utilisation map (both read in full this
session, not grepped): `css_property`/`css_layer`/`css_element`/`css_state`/
`css_tier` are the FRONT-1 DECLARATIVE CSS-ROUTING columns (seeded 2026-07-21,
`7a6a7586`) that tell the CONVERTER which CSS declaration maps to which attr
during a cloning run. They are a completely SEPARATE mechanism from "has this
attribute been migrated from a flat per-device trio to one tier object" — the
tier-object migration programme's own `migrate-tier-object.py` docstring states
plainly (LEDGER council finding #3, re-verified this session): "Every
migrate-*.py reads ZERO rows from the 3,166-row DB — they re-glob block.json."
Empirically confirmed live this session: of the 306 `%Tablet`/`%Mobile` rows,
only 23 have `css_tier` populated at all, and every one of those 23 ALSO has
`css_property` populated — i.e. `css_tier` is not a migration-status flag, it
is metadata attached to a small, unrelated, already-seeded subset. Using it as
the denominator would be scoring the wrong axis entirely.

STEP 2 — the next-most-obvious approach (`attr_type = 'object'` = "done") is
ALSO documented as wrong, independently, by this repo's own architecture work.
`.claude/plans/spec-39-seed-requirements.md` "G5" (read in full this session,
lines 262-291) states the exact constraint this script has to respect:

    "THREE shapes hide under `attr_type='object'`, and NOTHING in the schema
    separates them: (1) a flat-sibling trio where the base happens to be
    object-shaped with Tablet/Mobile siblings STILL scalar (half-migrated —
    the actual non-conforming case); (2) a migrated tier-object (the actual
    target state — base is one object, siblings deleted); (3) a base-only
    box/asset object that legitimately has NO tier dimension at all, or has a
    per-tier box/asset family that is object at EVERY tier by original design
    (D496/D521) and was never a flat scalar to begin with. Testing
    `attr_type=='object'` conflates all three. Testing whether `{base}Tablet`
    exists separates (1) from {2,3} but NOT 2 from 3."

This was independently re-derived this session by direct query (not assumed
from the doc): grouping every `sgs/%` row whose name ends `Tablet`/`Mobile`
into (block_slug, base_property) families and checking the base attr's type
plus the sibling types gives, right now: 153 families total → 88 where NO
desktop-tier row exists under either name (`{base}` or `{base}Desktop`) — not
a valid trio, out of scope by the migration's own definition (a "trio" needs
three tiers; two examples: `sgs/accordion.padding`/`.margin`, both siblings
already `object`, i.e. shape 3 above) → 28 where the base AND every surviving
sibling are ALL `object`-typed (the D496/D521 "per-tier box/asset family,
object at every tier by design, correct as-is" shape — e.g.
`sgs/container.padding`/`paddingTablet`/`paddingMobile`, each an independent
4-side box object, one per device tier by intentional design, not a flat
value ever waiting to be folded) → 37 families left where the base is
scalar-typed (string/number/boolean/integer) and at least one Tablet/Mobile
sibling is ALSO scalar-typed. That surviving 37 is genuinely, provably,
un-migrated: a live flat trio, no ambiguity, matching `migrate-tier-object.py`'s
own `classify()` FLAT/BLENDED test exactly (base object + scalar sibling =
BLENDED; base scalar + scalar sibling = FLAT — the DB currently holds zero
BLENDED cases, only FLAT, re-verified by query, not assumed).

STEP 3 — the honest, load-bearing limitation this script CANNOT get around,
and must not paper over: a family that HAS been migrated has its Tablet/Mobile
SIBLING ROWS DELETED as part of the fix (`migrate-tier-object.py --fix --apply`
folds the trio into one object row and removes the other two). That means a
FINISHED family is structurally INVISIBLE to any census keyed on "does a
Tablet/Mobile row still exist" — there is nothing left to find. This is not a
bug in this script's logic; it is exactly the G5 gap quoted above ("shape 2 is
indistinguishable from shape 3 once done"), independently reproduced here:
scanning the whole DB for families with an object base and NO surviving
sibling returns FAMILIES THAT WERE NEVER FLAT TO BEGIN WITH (asset/box shape)
just as often as families that WERE flat and are now finished — and the
schema has no column that tells them apart (`decisions.md` records this same
constraint as unresolved architecture work, not something a reporting script
can decide on its own authority). Building a heuristic to guess the difference
(e.g. "does this same property name also appear as a bare object row
elsewhere") would be reasoning to a number from a hint, not deriving one from
a query the schema can actually answer — exactly the mistake this repo's own
records warn against ("an estimate is not an enumeration"; "a derived field
used as a scope predicate is self-fulfilling" — the census here avoided that
trap for the FLAT population specifically by keying on the population that is
provably still there, not on the population's absence).

CONSEQUENCE FOR THE NUMBERS BELOW: "conformance" as printed here is a FLOOR,
not a whole-programme completion rate. It answers "of the population that is
STILL STRUCTURALLY VISIBLE AS FLAT today, how much of it has been fixed?" —
which is necessarily 0 by construction (a fixed family stops being visible).
True whole-programme completion is >= the number below; decisions.md already
records several properties fixed that are invisible to this query by design
(`gap`, `columns` on at least one block, `contentBandPadding`, `fontSize`,
`sgs/media.order`, `decorative-image.positionX/Y` — spec-39-seed-requirements.md
line 271). The two numbers that ARE fully reliable, and are the actual
burn-down signal to watch run over run, are "properties remaining" and
"non-conforming pairs": both are counts of things PROVEN to still exist by a
direct query, and both can only go DOWN as `migrate-tier-object.py --property
<prop> --fix --apply` clears each property. When "non-conforming pairs" hits
zero, either the migration is finished or everything remaining has fallen into
the same invisibility gap — at that point the gap itself (an allow-list of
known-migrated property names, per spec-39's own suggested fix direction) is
the next thing to build, not this script.

Ground-truth commands run this session to establish every figure above
(sgs-framework.db at `~/.claude/skills/sgs-wp-engine/sgs-framework.db` — the
same DB path every sibling script in this directory uses, e.g.
`audit-declared-vs-seeded-roles.py`, `generate-db-catalogue.py`,
`audit-feature-parity.py`):

    SELECT COUNT(*) FROM block_attributes                        -- 3166
    SELECT COUNT(*) FROM block_attributes
      WHERE attr_name LIKE '%Tablet' OR attr_name LIKE '%Mobile'  -- 306
    SELECT COUNT(*) FROM block_attributes WHERE css_tier IS NULL  -- 3136
    (plus the per-family classification this script runs itself, in `census()`)

============================================================================
WHAT THIS SCRIPT DOES
============================================================================
Read-only query against `sgs-framework.db` (never mutates it — a read-only
URI connection is used deliberately, matching the convention of the sibling
audit/report scripts in this directory; `converter/db/db_lookup.py` was NOT
used here even though it is a "db_lookup.py" in this repo, because importing
it runs six schema-migration functions against the LIVE, SHARED DB as a
side effect of import — wrong tool for a plain reporter, especially with
another track's work in flight this session).

For every `sgs/%` (block_slug, base_property) family derived from a surviving
`{base}Tablet`/`{base}Mobile` row:
  - EXCLUDE (out of scope, not printed as a number that trends anywhere) if
    no desktop-tier representation exists under either name, or if base +
    every surviving sibling are already uniformly `object`-typed (D496/D521
    per-tier box/asset family, correct as-is).
  - Otherwise it is a live FLAT or BLENDED family — the burn-down population.

Run:
    python plugins/sgs-blocks/scripts/programme-progress.py            # human-readable
    python plugins/sgs-blocks/scripts/programme-progress.py --json     # machine-readable

No `--check` mode and no exit-code gating — this is a REPORTER, not a gate.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import sqlite3
import sys
from pathlib import Path

# Windows consoles default to cp1252 and raise UnicodeEncodeError on non-ASCII
# output. Standing repo rule for Python scripts on this machine.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

_TIER_SUFFIX_RE = re.compile(r"^(.*)(Tablet|Mobile)$")
_SCALAR_TYPES = {"string", "number", "boolean", "integer", "array", "rich-text", "string|boolean"}


def get_connection() -> sqlite3.Connection:
    """Open a READ-ONLY connection to the canonical SGS DB.

    Read-only by URI mode (`mode=ro`) so this reporter can never write to a
    DB another track may be relying on this session. Matches the path + the
    read-only-URI convention used by `generate-db-catalogue.py` and the
    read-only queries in `sgs-update-v2.py` / `audit-declared-vs-seeded-roles.py`
    (which itself opens `sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)`).
    """
    if not SGS_DB.exists():
        print(f"FATAL: sgs-framework.db not found at {SGS_DB}", file=sys.stderr)
        sys.exit(1)
    return sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)


def census(conn: sqlite3.Connection) -> dict:
    """Classify every sgs/% (block_slug, base_property) tier family.

    Mirrors `migrate-tier-object.py`'s own `classify()` shape taxonomy
    (FLAT / BLENDED / OBJECT / ASSET / ABSENT) computed from the DB instead
    of block.json — a complementary view of the same programme, not a
    competing one. See the module docstring for the full justification of
    what is included vs excluded and why.
    """
    rows = conn.execute(
        "SELECT block_slug, attr_name, attr_type FROM block_attributes "
        "WHERE block_slug LIKE 'sgs/%'"
    ).fetchall()
    by_key: dict[tuple[str, str], str] = {(slug, name): t for slug, name, t in rows}

    families: dict[tuple[str, str], dict[str, str]] = collections.defaultdict(dict)
    for (slug, name), attr_type in by_key.items():
        m = _TIER_SUFFIX_RE.match(name)
        if m:
            base, tier = m.group(1), m.group(2).lower()
            families[(slug, base)][tier] = attr_type

    excluded_absent: list[dict] = []
    excluded_asset: list[dict] = []
    nonconforming: list[dict] = []

    for (slug, base), tiers in sorted(families.items()):
        base_bare = by_key.get((slug, base))
        base_desktop = by_key.get((slug, base + "Desktop"))
        base_type = base_bare if base_bare is not None else base_desktop
        base_name = (
            base if base_bare is not None
            else (base + "Desktop" if base_desktop is not None else None)
        )

        if base_type is None:
            # No desktop-tier row under either name at all — not a valid
            # three-tier trio by the migration's own definition (§ STEP 2).
            excluded_absent.append({"block_slug": slug, "property": base})
            continue

        all_present_types = [base_type] + list(tiers.values())
        if all(t == "object" for t in all_present_types):
            # D496/D521 per-tier box/asset family — object at every tier by
            # design, never a flat scalar, correct as-is (classify()'s ASSET).
            excluded_asset.append({"block_slug": slug, "property": base})
            continue

        pairs = [(slug, base_name)]
        if "tablet" in tiers:
            pairs.append((slug, base + "Tablet"))
        if "mobile" in tiers:
            pairs.append((slug, base + "Mobile"))

        nonconforming.append(
            {
                "block_slug": slug,
                "property": base,
                "base_type": base_type,
                "shape": "BLENDED" if base_type == "object" else "FLAT",
                "pairs": pairs,
            }
        )

    return {
        "excluded_absent": excluded_absent,
        "excluded_asset": excluded_asset,
        "nonconforming_families": nonconforming,
    }


def build_report(data: dict) -> dict:
    nonconforming = data["nonconforming_families"]
    all_pairs = [pair for family in nonconforming for pair in family["pairs"]]
    properties_remaining = sorted({family["property"] for family in nonconforming})

    # See the module docstring, STEP 3: a fully-migrated family's sibling
    # rows are deleted, so it is structurally invisible to this census.
    # `conforming_pairs` is therefore 0 BY CONSTRUCTION, not by measurement —
    # this is stated explicitly rather than silently reported as a real 0%.
    conforming_pairs = 0
    total_pairs_in_scope = conforming_pairs + len(all_pairs)
    percent = (
        round(conforming_pairs / total_pairs_in_scope * 100, 1)
        if total_pairs_in_scope
        else 100.0
    )

    flat_count = sum(1 for f in nonconforming if f["shape"] == "FLAT")
    blended_count = sum(1 for f in nonconforming if f["shape"] == "BLENDED")

    return {
        "conformance": {
            "conforming_pairs": conforming_pairs,
            "total_pairs_in_scope": total_pairs_in_scope,
            "percent": percent,
            "nonconforming_families": len(nonconforming),
            "caveat": (
                "A PERCENTAGE IS NOT DERIVABLE and is deliberately not shown. "
                "This is a FLOOR on remaining work, not a whole-programme "
                "completion rate. It counts only the population still "
                "carrying a surviving Tablet/Mobile sibling row (provably "
                "not-yet-migrated). A migrated tier-object attribute has its "
                "sibling rows deleted as part of the fix, which makes a "
                "finished family structurally indistinguishable from an "
                "attribute that never needed migration -- documented as gap "
                "G5 in .claude/plans/spec-39-seed-requirements.md (lines "
                "262-291): 'three shapes hide under attr_type=object, "
                "nothing in the schema separates them'. True whole-programme "
                "completion is >= this figure. See the module docstring for "
                "the full derivation."
            ),
        },
        "properties_remaining": {
            "count": len(properties_remaining),
            "names": properties_remaining,
        },
        "nonconforming_pairs": {
            "count": len(all_pairs),
            "pairs": [{"block_slug": s, "attr_name": n} for s, n in all_pairs],
        },
        "families_remaining": {
            "count": len(nonconforming),
            "flat": flat_count,
            "blended": blended_count,
        },
        "excluded_out_of_scope": {
            "no_desktop_tier_representation": len(data["excluded_absent"]),
            "asset_or_box_object_at_every_tier": len(data["excluded_asset"]),
        },
    }


def print_human(report: dict) -> None:
    conf = report["conformance"]
    props = report["properties_remaining"]
    pairs = report["nonconforming_pairs"]
    families = report["families_remaining"]
    excluded = report["excluded_out_of_scope"]

    print("=" * 78)
    print("TIER-OBJECT MIGRATION PROGRAMME — BURN-DOWN REPORT")
    print("=" * 78)
    print()
    # Deliberately NOT led with a percentage. The only population the schema
    # can still identify is the NOT-yet-migrated one, so any ratio built from
    # it is 0% by construction and can never move -- it would read as
    # catastrophe while telling you nothing. The counts below are the real
    # burn-down: each falls to zero as work lands.
    print(
        f"1. Remaining work: {conf['total_pairs_in_scope']} attributes "
        f"across {conf['nonconforming_families']} families"
    )
    print(f"   ⚠ {conf['caveat']}")
    print()
    print(f"2. Properties remaining ({props['count']} distinct base names):")
    if props["names"]:
        for name in props["names"]:
            print(f"   - {name}")
    else:
        print("   (none — every observable flat family has been migrated)")
    print()
    print(f"3. Non-conforming (block_slug, attr_name) pairs: {pairs['count']}")
    print(
        f"   Spanning {families['count']} families "
        f"({families['flat']} FLAT, {families['blended']} BLENDED)"
    )
    print()
    print("-" * 78)
    print("Out of scope (not part of the migration target, excluded from the")
    print("figures above):")
    print(
        f"   - No desktop-tier representation at all (not a valid trio): "
        f"{excluded['no_desktop_tier_representation']}"
    )
    print(
        f"   - Object at every tier by design (D496/D521 box/asset family): "
        f"{excluded['asset_or_box_object_at_every_tier']}"
    )
    print("=" * 78)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Burn-down reporter for the tier-object migration programme "
            "(flat per-device attribute trio -> one tier-object attr)."
        )
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="emit the report as JSON instead of the human-readable format",
    )
    args = parser.parse_args()

    conn = get_connection()
    try:
        data = census(conn)
    finally:
        conn.close()

    report = build_report(data)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print_human(report)

    return 0


if __name__ == "__main__":
    sys.exit(main())
