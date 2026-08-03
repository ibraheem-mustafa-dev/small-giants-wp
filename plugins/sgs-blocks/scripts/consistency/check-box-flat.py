#!/usr/bin/env python3
"""
check-box-flat.py

DISCOVERY GATE — flags box-object-capable controls still stored as FLAT
scalars (per-side / per-corner attributes that should be a single box-object
attr driven by WP's native BoxControl, per the box-object interface contract
— `.claude/plans/2026-07-09-box-object-interface-contract.md`).

This is a BASELINE-DIFF gate, mirroring `check-box-family-guard.py` /
`box-family-guard-baseline.json`'s pattern (STOP-14: baseline the CURRENT
reality, fail only on NEW additions).

What counts as a "flat box scalar"
-----------------------------------
An attribute in any `plugins/sgs-blocks/src/blocks/*/block.json` where:
  1. Its declared `type` is `"number"` or `"string"`, AND
  2. Its name matches a 4-side/4-corner-capable box family:
       - ends in one of: Top, Right, Bottom, Left,
                          TopLeft, TopRight, BottomLeft, BottomRight
       - OR ends in (case-insensitive): padding, borderWidth, borderRadius

EXCLUDED (legit keep-scalar patterns — never flagged):
  - name contains "shapeDivider" (case-insensitive) — SVG shape-divider
    controls are single-value by design, not a 4-side/4-corner box family.
  - single-side margins matching /Margin(Top|Bottom|Left|Right)$/ — an
    intentional single-side nudge, not a 4-side box family member.

Baselined items carry a TRIAGE STATUS (2026-08-03 revision)
-------------------------------------------------------------
Before this revision the non-Track-2 baselined set printed under one
undifferentiated "UPGRADE WORKLIST" heading. That heading caused a real
mistake: it reads as a to-do list, but 10 of the 11 items on it are a
DOCUMENTED, Bean-approved, qc-council-validated DECISION to keep them as
scalars (Spec 32 §6.1c, decisions.md D383, memory/session-2026-07-26-2.md)
— intentionally-uniform pill/tag/badge/icon-circle radii, `sgs/label`
radius, and brand-strip tile padding/border-width are NOT box-object
candidates. The 11th (`icon::backgroundPadding`) was the single "spot-check"
item from that same triage, resolved to KEEP and recorded directly in its
own `block.json` description. The GENUINE-UPGRADE set from that triage (grid-
item paddings/radii + product-card CTA border) was already closed at D383.

So every baselined key now carries a `status` + `ref` in the baseline JSON
itself (data, not a hardcoded Python dict — see "Why the baseline file, not
a dict" below), and the report groups by status instead of printing one flat
"worklist":
  - `deliberate-keep`   — a recorded decision NOT to convert. Printed with
                          its citation. Never actionable without a fresh,
                          explicit instruction that names the decision it
                          overrides.
  - `genuine-upgrade`   — an accepted-but-not-yet-converted candidate. THIS
                          is the only status that reads as a to-do. Currently
                          empty (the 2026-07-25 genuine-upgrade set closed at
                          D383; card-grid landed the same week).
  - `track2`            — belongs to a paused in-flight track (mega-*/site-*/
                          nav-drawer/nav-menu/adaptive-nav). Informational
                          only, matches the pre-existing Track-2 exclusion.
  - `untriaged`         — a baselined key with NO recorded status. This is
                          the safety net: any entry written by an
                          `--update-baseline` run that a human didn't
                          consciously classify lands here, loud and separate,
                          rather than silently vanishing into either bucket.
                          A gate reader should treat `untriaged` as "ask
                          Bean before touching this", the same as
                          `deliberate-keep` — the difference is `untriaged`
                          means nobody has recorded WHY yet.

Why the baseline file, not a dict
-----------------------------------
This project's binding rule (blub.db 260 / R-31-1) is DB-first / no hardcoded
lookup dicts where a data source can carry the same information instead. The
triage state here is exactly that kind of data — a per-key classification —
so it lives in `box-flat-baseline.json` (already the mechanism this gate uses
for "known" state) as a `status`/`ref` pair per key, not as a Python dict
literal in this file. The script itself carries only the print/grouping LOGIC
and the closed, tiny vocabulary of valid status values (`_VALID_STATUSES`) —
that vocabulary is not per-key classification data, it is the fixed set of
labels the data is allowed to use, the same way an enum column is not a
"hardcoded lookup".

Usage
-----
    python scripts/consistency/check-box-flat.py               # gate (default)
    python scripts/consistency/check-box-flat.py --update-baseline

Baseline
--------
`box-flat-baseline.json` (alongside this script) — freezes CURRENT reality
(including Track 2's in-flight mega-*/nav-*/site-* blocks) so nothing that
already exists today fails the gate. New flat box scalars added AFTER the
baseline was taken are flagged as violations. `--update-baseline` PRESERVES
every existing key's recorded `status`/`ref` — it only ADDS newly-discovered
keys (as `untriaged`) and drops keys no longer present. It never overwrites
an existing status, so a conscious triage decision can't be silently erased
by a routine re-baseline.

Exit codes
----------
  0 — no NEW flat box scalars (baseline unchanged or entries removed).
  1 — one or more NEW flat box scalars found vs the baseline.

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent  # plugins/sgs-blocks/scripts/consistency/
_BLOCKS_DIR = _HERE.parent.parent / "src" / "blocks"  # plugins/sgs-blocks/src/blocks/
_BASELINE_PATH = _HERE / "box-flat-baseline.json"

# ---------------------------------------------------------------------------
# Track 2 in-flight blocks — never hard-block on these (excluded from the
# upgrade worklist, but STILL counted in the baseline/gate diff itself, so a
# genuinely NEW flat scalar on one of these blocks still surfaces — just not
# in the "ready to fix now" worklist).
# ---------------------------------------------------------------------------
_TRACK2_PREFIXES = ("mega-", "site-", "nav-drawer", "nav-menu", "adaptive-nav")

# The closed, fixed vocabulary of valid triage statuses — NOT per-key
# classification data (see "Why the baseline file, not a dict" above). A
# status outside this set is a baseline-authoring error, flagged loudly.
_VALID_STATUSES = frozenset({"deliberate-keep", "genuine-upgrade", "track2", "untriaged"})


def _is_track2_block(block_slug: str) -> bool:
    return any(
        block_slug == prefix.rstrip("-") or block_slug.startswith(prefix)
        for prefix in _TRACK2_PREFIXES
    )


# ---------------------------------------------------------------------------
# Box-family matching
# ---------------------------------------------------------------------------
_SIDE_CORNER_SUFFIXES = (
    "Top", "Right", "Bottom", "Left",
    "TopLeft", "TopRight", "BottomLeft", "BottomRight",
)
_FAMILY_SUFFIX_RE = re.compile(r"(padding|borderwidth|borderradius)$", re.IGNORECASE)
_SINGLE_SIDE_MARGIN_RE = re.compile(r"Margin(Top|Bottom|Left|Right)$")


def _is_flat_box_scalar(attr_name: str, attr_type: str) -> bool:
    if attr_type not in ("number", "string"):
        return False

    # Exclusion 1 — shape-divider controls (single-value by design).
    if "shapedivider" in attr_name.lower():
        return False

    # Exclusion 2 — single-side margin nudges.
    if _SINGLE_SIDE_MARGIN_RE.search(attr_name):
        return False

    # Match 1 — ends in a 4-side/4-corner token.
    if attr_name.endswith(_SIDE_CORNER_SUFFIXES):
        return True

    # Match 2 — ends in padding/borderWidth/borderRadius (case-insensitive).
    if _FAMILY_SUFFIX_RE.search(attr_name):
        return True

    return False


# ---------------------------------------------------------------------------
# Scan
# ---------------------------------------------------------------------------
def _iter_block_jsons() -> list[Path]:
    if not _BLOCKS_DIR.exists():
        return []
    return sorted(_BLOCKS_DIR.glob("*/block.json"))


def collect_flat_box_scalars() -> list[str]:
    """Returns sorted list of "<blockslug>::<attr>" flat box scalars found
    across the current tree."""
    found: set[str] = set()
    for bj_path in _iter_block_jsons():
        block_slug = bj_path.parent.name
        try:
            with open(bj_path, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"[check-box-flat] WARNING: could not parse {bj_path}: {exc}", file=sys.stderr)
            continue

        if not isinstance(data, dict):
            continue

        attrs = data.get("attributes")
        if not isinstance(attrs, dict):
            continue

        for attr_name, attr_def in attrs.items():
            if not isinstance(attr_def, dict):
                # Guard non-dict attribute values (malformed block.json entries)
                continue
            attr_type = attr_def.get("type")
            if not isinstance(attr_type, str):
                continue
            if _is_flat_box_scalar(attr_name, attr_type):
                found.add(f"{block_slug}::{attr_name}")

    return sorted(found)


# ---------------------------------------------------------------------------
# Baseline helpers — schema v2: {"_comment", "generated", "entries": {key:
# {"status": ..., "ref": ...}}}. Back-compat: a legacy `{"keys": [...]}` or
# bare-list baseline loads every key as status="untriaged" (never silently
# promoted to deliberate-keep) so an old-format file still surfaces loudly
# instead of being misread.
# ---------------------------------------------------------------------------
def _load_baseline() -> dict[str, dict[str, str]]:
    if not _BASELINE_PATH.exists():
        return {}
    try:
        with open(_BASELINE_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return {}

    if isinstance(data, dict) and isinstance(data.get("entries"), dict):
        entries: dict[str, dict[str, str]] = {}
        for key, info in data["entries"].items():
            if isinstance(info, dict):
                status = info.get("status", "untriaged")
                if status not in _VALID_STATUSES:
                    print(
                        f"[check-box-flat] WARNING: baseline key {key!r} has "
                        f"unrecognised status {status!r} — treating as "
                        "'untriaged'. Valid statuses: "
                        f"{sorted(_VALID_STATUSES)}",
                        file=sys.stderr,
                    )
                    status = "untriaged"
                entries[key] = {"status": status, "ref": info.get("ref", "")}
            else:
                entries[key] = {"status": "untriaged", "ref": ""}
        return entries

    # Legacy shapes (pre-2026-08-03): {"keys": [...]} or a bare list.
    legacy_keys: list[str] = []
    if isinstance(data, dict):
        legacy_keys = list(data.get("keys", []))
    elif isinstance(data, list):
        legacy_keys = list(data)
    return {
        key: {
            "status": "untriaged",
            "ref": "migrated from legacy baseline format — status not yet recorded",
        }
        for key in legacy_keys
    }


def _save_baseline(current_keys: list[str], existing: dict[str, dict[str, str]]) -> dict[str, dict[str, str]]:
    """Write the baseline, PRESERVING every existing key's status/ref and
    adding newly-discovered keys as 'untriaged' (never silently defaulted to
    deliberate-keep). Keys no longer present are dropped."""
    new_entries: dict[str, dict[str, str]] = {}
    for key in current_keys:
        if key in existing:
            new_entries[key] = existing[key]
        else:
            new_entries[key] = {
                "status": "untriaged",
                "ref": "newly discovered — needs a conscious triage decision "
                       "(deliberate-keep / genuine-upgrade / track2) before "
                       "this is either converted or relied upon as settled.",
            }

    data = {
        "_comment": (
            "box-flat-baseline.json — DISCOVERY-GATE baseline for "
            "check-box-flat.py. Freezes the flat box scalars present in the "
            "tree at generation time (including Track 2 in-flight "
            "mega-*/nav-*/site-*/adaptive-nav blocks) so nothing CURRENT "
            "fails the gate. Each entry carries a triage `status` "
            "(deliberate-keep / genuine-upgrade / track2 / untriaged) + a "
            "`ref` citation — see the script's module docstring "
            "'Baselined items carry a TRIAGE STATUS'. Regenerate with "
            "--update-baseline only after consciously reviewing new entries "
            "— it preserves every existing status, only newly-discovered "
            "keys land as 'untriaged'."
        ),
        "generated": "2026-08-03",
        "entries": new_entries,
    }
    with open(_BASELINE_PATH, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")
    return new_entries


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Discovery gate — flags NEW flat box scalars vs baseline."
    )
    parser.add_argument(
        "--update-baseline", action="store_true", default=False,
        help="Write current flat-box-scalar set to the baseline and exit 0. "
             "Preserves every existing key's triage status.",
    )
    args = parser.parse_args()

    current = collect_flat_box_scalars()
    baseline = _load_baseline()

    if args.update_baseline:
        updated = _save_baseline(current, baseline)
        added = sorted(set(updated) - set(baseline))
        removed = sorted(set(baseline) - set(updated))
        print(f"[check-box-flat] Baseline updated — {len(updated)} key(s) written to {_BASELINE_PATH}")
        if added:
            print(f"  {len(added)} newly-discovered key(s) added as 'untriaged': {added}")
        if removed:
            print(f"  {len(removed)} key(s) no longer present, dropped: {removed}")
        return 0

    baseline_set = set(baseline)
    current_set = set(current)

    new_entries = sorted(current_set - baseline_set)
    removed_entries = sorted(baseline_set - current_set)

    if new_entries:
        print(f"[check-box-flat] {len(new_entries)} NEW flat box scalar(s) — violation(s):")
        print()
        for key in new_entries:
            print(f"  [NEW] {key}")
        print()
        print(
            "[check-box-flat] These attributes are 4-side/4-corner-capable "
            "and stored as flat scalars. Per the box-object interface "
            "contract, upgrade to a box-object attr driven by WP's native "
            "BoxControl, gated by the DB `block_attributes.box_family` "
            "column. If this addition is deliberate short-term debt, run "
            "--update-baseline to accept it consciously — it will land as "
            "'untriaged' until a status is recorded in the baseline file."
        )

    if removed_entries:
        if new_entries:
            print()
        print(
            f"[check-box-flat] {len(removed_entries)} entr{'y' if len(removed_entries) == 1 else 'ies'} "
            "in the baseline no longer present in the tree (informational — "
            "the baseline can be updated):"
        )
        for key in removed_entries:
            print(f"  [REMOVED] {key}")
        print(
            "[check-box-flat] Run --update-baseline to shrink the baseline "
            "to match (not required — this is informational only)."
        )

    if not new_entries and not removed_entries:
        print(f"OK — {len(current)} flat box scalars, all baselined")

    # ------------------------------------------------------------------
    # Triage-state report — replaces the old undifferentiated "UPGRADE
    # WORKLIST". Groups every baselined (i.e. NOT new-violation) key by its
    # recorded status so a reader can never mistake a documented
    # deliberate-keep decision for a to-do again.
    # ------------------------------------------------------------------
    baselined_now = [key for key in current if key in baseline]
    by_status: dict[str, list[str]] = {status: [] for status in _VALID_STATUSES}
    for key in baselined_now:
        by_status[baseline[key]["status"]].append(key)

    print()
    print("=" * 78)
    print("BASELINED FLAT BOX SCALARS — triage state (2026-08-03 revision)")
    print("=" * 78)

    genuine = sorted(by_status["genuine-upgrade"])
    print(f"\nGENUINE-UPGRADE ({len(genuine)}) — the ONLY status that reads as a to-do:")
    if genuine:
        for key in genuine:
            ref = baseline[key]["ref"]
            print(f"  {key}" + (f"   [{ref}]" if ref else ""))
    else:
        print("  (none — the 2026-07-25 genuine-upgrade set closed at D383;")
        print("   see decisions.md D383 + memory/session-2026-07-26-2.md)")

    keep = sorted([k for k in by_status["deliberate-keep"] if not _is_track2_block(k.split("::", 1)[0])])
    print(f"\nDELIBERATE-KEEP ({len(keep)}) — a recorded decision NOT to convert.")
    print("  Do not treat these as a to-do without a fresh instruction that")
    print("  explicitly names and overrides the cited decision:")
    for key in keep:
        ref = baseline[key]["ref"] or "(no citation recorded)"
        print(f"  {key}   [{ref}]")

    untriaged = sorted([k for k in by_status["untriaged"] if not _is_track2_block(k.split("::", 1)[0])])
    if untriaged:
        print(f"\nUNTRIAGED ({len(untriaged)}) — NO recorded decision. Do NOT assume either")
        print("  'safe to convert' or 'safe to leave' — ask before touching:")
        for key in untriaged:
            print(f"  {key}   [{baseline[key]['ref']}]")

    track2 = sorted([k for k in baselined_now if _is_track2_block(k.split("::", 1)[0])])
    print(f"\nTRACK2 IN-FLIGHT ({len(track2)}) — paused track, informational only,")
    print("  never actionable until the track resumes:")
    for key in track2:
        print(f"  {key}")

    return 1 if new_entries else 0


if __name__ == "__main__":
    raise SystemExit(main())
