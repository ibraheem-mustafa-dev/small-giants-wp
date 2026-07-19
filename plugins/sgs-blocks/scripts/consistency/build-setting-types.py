#!/usr/bin/env python3
"""
Spec 35 UNIT A+ Phase 1 — dedup every SGS attribute to its unique SEMANTIC SETTING.

The dedup is load-bearing (a wrong merge/split corrupts the whole registry), so this uses
MULTI-EVIDENCE with confidence + a FLAGGED bucket — it never silently decides an ambiguous case.

IDENTITY MODEL (strongest → weakest):
  1. CSS property the attr resolves to — via a boundary-aware LONGEST-suffix match against the
     DB-authoritative `property_suffixes` map (which already collapses spelling variants:
     BackgroundColor/BackgroundColour/Bg/BgColour → background-color). This is the primary key.
  2. canonical_slot (when set) — a secondary structural identity.
  3. role + normalised base name — fallback for content/behaviour attrs with no CSS property.

GUARDS:
  - FALSE-MERGE: members of a proposed setting must AGREE on role + emit_shape; disagreement → FLAG.
  - FALSE-SPLIT: groups keyed to the same css_property are one setting by construction (spelling +
    prefix variants collapse). A no-property attr whose base name matches a property group → FLAG.
  - Every attr with NO property match is FLAGGED (needs role/Haiku adjudication), never force-grouped.

OUTPUT: setting-types.json (high-confidence groups) + flagged[] (ambiguous → Haiku adjudication).
Re-run after /sgs-update. DB-first (R-31-1); property_suffixes is the authority, no hardcoded dict.
"""
import json
import re
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
OUT = Path(__file__).parent / "setting-types.json"

RESPONSIVE_SUFFIXES = ("Tablet", "Mobile", "Desktop")
UNIT_SUFFIXES = ("Unit",)


def q(conn, sql):
    return [dict(r) for r in conn.execute(sql).fetchall()]


def strip_responsive(name: str) -> str:
    """Strip a trailing device-tier and/or Unit companion so paddingTablet == padding."""
    base = name
    changed = True
    while changed:
        changed = False
        for suf in RESPONSIVE_SUFFIXES + UNIT_SUFFIXES:
            if base.endswith(suf) and len(base) > len(suf):
                base = base[: -len(suf)]
                changed = True
    return base


def boundary_suffix_match(name: str, suffixes_by_len: list[str]) -> str | None:
    """
    Longest suffix from property_suffixes that `name` ends with at a CamelCase word boundary.
    Boundary = the suffix starts at an uppercase char in the original name, OR is the whole name
    (case-insensitively). Prevents 'Bg' matching mid-word junk while catching titleFontSize→FontSize
    and the bare fontSize→FontSize.
    """
    low = name.lower()
    for suf in suffixes_by_len:  # already sorted longest-first
        sl = suf.lower()
        if low == sl:
            return suf
        if low.endswith(sl):
            start = len(name) - len(suf)
            if start == 0 or name[start].isupper():
                return suf
    return None


def main():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # property_suffixes: the DB-authoritative suffix -> css_property map (primary dedup key).
    ps = q(conn, "SELECT suffix, css_property FROM property_suffixes")
    suffix_to_prop = {r["suffix"]: r["css_property"] for r in ps}
    suffixes_by_len = sorted(suffix_to_prop.keys(), key=len, reverse=True)

    attrs = q(conn,
        "SELECT block_slug, attr_name, attr_type, default_value, enum_values, role, "
        "emit_shape, canonical_slot, inspector_control_type, box_family "
        "FROM block_attributes WHERE source='sgs' ORDER BY attr_name")

    # Resolve each attr to a setting KEY + record its evidence.
    resolved = []
    for a in attrs:
        name = a["attr_name"]
        base = strip_responsive(name)
        suf = boundary_suffix_match(base, suffixes_by_len)
        css_prop = suffix_to_prop.get(suf) if suf else None
        if css_prop and css_prop != "None":
            key = f"css:{css_prop}"
            basis = "css-property"
        elif a["canonical_slot"]:
            key = f"slot:{a['canonical_slot']}"
            basis = "canonical-slot"
        elif a["role"]:
            key = f"role:{a['role']}:{base.lower()}"
            basis = "role+base"
        else:
            key = f"unresolved:{base.lower()}"
            basis = "unresolved"
        resolved.append({**a, "base": base, "matched_suffix": suf,
                         "css_property": css_prop, "setting_key": key, "basis": basis})

    # Group into settings.
    groups: dict[str, list] = {}
    for r in resolved:
        groups.setdefault(r["setting_key"], []).append(r)

    settings = []
    flagged = []
    # base-name -> which setting keys carry it (for false-split detection)
    base_to_keys: dict[str, set] = {}
    for key, members in groups.items():
        for m in members:
            base_to_keys.setdefault(m["base"].lower(), set()).add(key)

    for key, members in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        roles = sorted({m["role"] for m in members if m["role"]})
        shapes = sorted({m["emit_shape"] for m in members if m["emit_shape"] and m["emit_shape"] != "None"})
        ctls = sorted({m["inspector_control_type"] for m in members if m["inspector_control_type"]})
        box_fams = sorted({m["box_family"] for m in members if m.get("box_family")})
        member_names = sorted({m["attr_name"] for m in members})
        member_blocks = sorted({m["block_slug"] for m in members})

        # --- DEDUP-RISK flags (do these belong together?) — kept SEPARATE from conformance ---
        dedup_flags = []
        is_css = key.startswith("css:")

        # FALSE-MERGE guard: a BOOLEAN member inside a CSS property group is almost certainly a
        # name-suffix mis-key (e.g. `fullWidth`/`overlayGradient`/`bgSvgTextShadow` booleans keyed
        # to css:width/background-image/box-shadow). A CSS length/colour value is never a boolean,
        # so these are split-candidates. NOTE: a ToggleControl on a STRING colour attr (nameColour,
        # pickerPillTextColour) is NOT a mis-key — it's a real colour with the wrong control, already
        # caught by conformance=divergent; don't flag it here (validated live 2026-07-19).
        suspect = [m["attr_name"] for m in members
                   if is_css and m.get("attr_type") == "boolean"]
        if suspect:
            dedup_flags.append(f"SUSPECT_MISKEY:{sorted(set(suspect))[:6]}")

        # FALSE-MERGE (shape): a length property group mixing object (box) + scalar members may be
        # two settings (a 4-side box vs a single value). Soft — object/scalar can co-exist legitimately.
        if len(shapes) > 1:
            dedup_flags.append(f"MULTI_SHAPE:{shapes}")

        # NOT decided by the authoritative property map -> needs review.
        if key.startswith("unresolved:") or key.startswith("role:"):
            dedup_flags.append("NO_PROPERTY_MATCH")

        # FALSE-SPLIT probe: same base name resolved to >1 setting key.
        for m in members:
            others = base_to_keys.get(m["base"].lower(), set()) - {key}
            if others:
                dedup_flags.append(f"POSSIBLE_SPLIT:{m['base']}~{sorted(others)}")
                break

        # --- CONFORMANCE (do the members use ONE optimal control?) — the standardisation target ---
        conformance = "consistent" if len(ctls) == 1 else ("divergent" if len(ctls) > 1 else "unknown")

        # Dedup confidence is HIGH when the DB property map (or a canonical_slot) decided it and no
        # dedup-risk flag fired. MULTI_CONTROL / MULTI_ROLE never lower dedup confidence — they are
        # conformance/labelling facts, not grouping errors.
        dedup_confidence = "high" if (not dedup_flags and members[0]["basis"] in ("css-property", "canonical-slot")) else "review"

        entry = {
            "setting_key": key,
            "css_property": members[0]["css_property"],
            "basis": members[0]["basis"],
            "distinct_attr_names": member_names,
            "attr_name_count": len(member_names),
            "instance_count": len(members),
            "blocks": member_blocks,
            "observed_roles": roles,
            "observed_emit_shapes": shapes,
            "observed_control_types": ctls,
            "observed_box_families": box_fams,
            "dedup_confidence": dedup_confidence,
            "conformance": conformance,
            "dedup_flags": sorted(set(dedup_flags)),
        }
        settings.append(entry)
        if dedup_confidence == "review":
            flagged.append({"setting_key": key, "dedup_flags": entry["dedup_flags"],
                            "sample_attrs": member_names[:8], "count": len(member_names)})

    conn.close()

    payload = {
        "_meta": {
            "purpose": "Spec 35 UNIT A+ Phase 1 — attributes deduped to unique semantic settings.",
            "dedup_key": "property_suffixes CSS property (primary) > canonical_slot > role+base; multi-evidence, flagged-not-decided.",
            "total_attr_instances": len(resolved),
            "distinct_attr_names": len({r['attr_name'] for r in resolved}),
            "unique_settings": len(settings),
            "dedup_high_confidence": sum(1 for s in settings if s["dedup_confidence"] == "high"),
            "dedup_needs_review": sum(1 for s in settings if s["dedup_confidence"] == "review"),
            "conformance_consistent": sum(1 for s in settings if s["conformance"] == "consistent"),
            "conformance_divergent": sum(1 for s in settings if s["conformance"] == "divergent"),
            "conformance_unknown": sum(1 for s in settings if s["conformance"] == "unknown"),
        },
        "settings": settings,
        "flagged_for_adjudication": flagged,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    m = payload["_meta"]
    print(f"setting-types.json written")
    print(f"  {m['total_attr_instances']} attr instances / {m['distinct_attr_names']} distinct names "
          f"-> {m['unique_settings']} unique settings")
    print(f"  DEDUP:       high-confidence={m['dedup_high_confidence']}   needs-review={m['dedup_needs_review']}")
    print(f"  CONFORMANCE: consistent={m['conformance_consistent']}  divergent={m['conformance_divergent']}  "
          f"unknown={m['conformance_unknown']}  (divergent = the standardisation worklist)")
    print("\n  Top 20 settings by attr-name count  (D=dedup, C=conformance):")
    for s in settings[:20]:
        d = "ok " if s["dedup_confidence"] == "high" else "REV"
        c = {"consistent": "OK ", "divergent": "DIV", "unknown": "?  "}[s["conformance"]]
        print(f"   D:{d} C:{c} {s['setting_key']:<32} names={s['attr_name_count']:<3} blocks={len(s['blocks']):<3} "
              f"ctls={s['observed_control_types']}")


if __name__ == "__main__":
    main()
