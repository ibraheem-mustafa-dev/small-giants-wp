#!/usr/bin/env python3
"""survey-responsive-shape.py — the responsive STORAGE-SHAPE census.

WHY THIS EXISTS
---------------
Spec 35 Phase 1.4 settled the shape question (Bean, 2026-08-10): the shared
wrapper is made fully responsive GENERICALLY, so "every block that uses it
doesn't need individual fixes that require forking". Two shapes were approved:

  TIER shape  {desktop, tablet, mobile}  — universal, applies to ANY property.
  BOX shape   {top, right, bottom, left} — ONLY for genuinely per-side
                                           properties (padding, margin,
                                           border-width, border-radius).

These are INDEPENDENT axes. A property can have one, both, or neither — text
colour cannot be a per-side box but CAN have tiers (a different colour on
mobile is perfectly legitimate). Conflating them is the specific confusion this
survey exists to make visible.

The legacy shape is FLAT TIER SIBLINGS: a scalar base plus `fooTablet` /
`fooMobile` rows. Contract §12 field 6 calls the coexistence of these shapes
"three incompatible STORAGE shapes" and warns that
`sgs_responsive_normalise_object()` has no concept of `ResponsiveBoxControl`'s
`base` key — "the landmine is unarmed, not disarmed".

⛔ THIS IS A CENSUS, NOT A GATE. It has no `--check` mode and must NOT be added
to `prebuild`. Putting a non-gating script in a gate chain is enforcement
theatre (D545). Its output is a WORK-LIST for the per-block migration, which is
deterministic, repetitive work suited to `/delegate`.

⚠ A FLAT FAMILY IS A CANDIDATE, NOT A DEFECT. Triage is per-family and this
script deliberately does not pretend otherwise:

  * A CASCADING VALUE (gap, columns, max-width, font-size) resolves ONE value
    per tier with fallback up the chain — the object model fits, and these are
    the real migration targets.
  * A PER-TIER ASSET (videoUrl/videoId/thumbnail on sgs/media,
    beforeImageId/Url on sgs/before-after) is a different RESOURCE per device,
    not a cascading value. `sgs/media`'s tiers are a deliberate runtime SWAP
    (D521) precisely because three <video> elements would each begin fetching.
    Migrating those to a tier object may be wrong. The survey flags them with
    an `asset_like` hint so triage starts from evidence.
  * INDEPENDENT PER-DEVICE FLAGS (sgsHideOn*, fxDisable*) are conjunctive — the
    operator must see every tier at once — and are NOT a cascade at all.

USAGE
  python scripts/surveys/survey-responsive-shape.py            # human census
  python scripts/surveys/survey-responsive-shape.py --json     # machine-readable
  python scripts/surveys/survey-responsive-shape.py --self-test
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

BLOCKS_DIR = Path(__file__).resolve().parents[2] / "src" / "blocks"
TIER_SUFFIXES = ("Tablet", "Mobile")

# Per-SIDE box properties — the ONLY families where the box shape is correct.
BOX_BASES = ("padding", "margin", "borderWidth", "borderRadius")

# Name fragments that indicate a per-tier ASSET rather than a cascading value.
# Deliberately a HINT, never an auto-exclusion: the whole point of the survey is
# that a human (or a delegated agent with evidence) triages each family.
ASSET_HINTS = ("image", "video", "media", "thumbnail", "logo", "svg", "poster", "url", "id")


def camel_words(name: str) -> list[str]:
    """Split a camelCase attribute name into lower-cased WHOLE words.

    ⚠ Word-boundary matching is mandatory here, not a nicety. A naive
    `substring in name.lower()` check matched the asset hint "id" INSIDE
    "hideOn" (h-ID-eon) and classified a boolean visibility flag as a media
    asset. Caught by this file's own self-test before it ever ran on the tree.
    Same failure this repo has recorded twice already
    (`a-substring-match-is-not-a-word-match`): `columns` matched inside
    `listColumns`, and `layout`/`gap` were over-counted the same way. A short
    hint like "id" or "url" collides constantly — always compare whole words.
    """
    return [w.lower() for w in re.findall(r"[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])", name)]


def classify(base: str, base_type: str) -> str:
    """Return the triage hint for one family. Never a verdict — a starting point."""
    words = camel_words(base)
    # TYPE first: a boolean is a per-device FLAG regardless of what it is named.
    # The declared type is a stronger signal than any name heuristic, and this
    # ordering is what stops `hideOnMobile` being read as a media asset.
    if base_type == "boolean":
        return "flag_like"
    if any(h in words for h in ASSET_HINTS):
        return "asset_like"
    if words and words[0] in [b.lower() for b in BOX_BASES] + ["border"]:
        return "box_family"
    return "cascading_value"


def scan_attributes(attrs: dict) -> list[dict]:
    """Find every tier family in one block's declared attributes."""
    out = []
    for key in attrs:
        m = re.match(r"^(.+?)(Tablet|Mobile)$", key)
        if not m:
            continue
        base = m.group(1)
        if base not in attrs:
            # Orphan tier — a tier sibling whose base is not declared at all.
            out.append({"base": base, "shape": "orphan_tier", "base_type": None,
                        "tiers": [key], "hint": "orphan"})
            continue
        base_type = attrs[base].get("type")
        shape = "both_shapes" if base_type == "object" else "flat_tiers"
        out.append({"base": base, "shape": shape, "base_type": base_type,
                    "tiers": [key], "hint": classify(base, base_type)})

    # Collapse per-base so Tablet+Mobile of one family is ONE finding, not two.
    merged: dict[str, dict] = {}
    for f in out:
        key = f["base"] + "|" + f["shape"]
        if key in merged:
            merged[key]["tiers"].extend(f["tiers"])
        else:
            merged[key] = f
    for f in merged.values():
        f["tiers"] = sorted(set(f["tiers"]))
    return sorted(merged.values(), key=lambda x: x["base"])


def survey(blocks_dir: Path) -> dict:
    findings = []
    scanned = 0
    for d in sorted(p for p in blocks_dir.iterdir() if p.is_dir()):
        bj = d / "block.json"
        if not bj.exists():
            continue
        try:
            data = json.loads(bj.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        scanned += 1
        for f in scan_attributes(data.get("attributes", {})):
            findings.append({**f, "block": data.get("name", f"sgs/{d.name}"), "dir": d.name})
    return {"blocks_scanned": scanned, "findings": findings}


def self_test() -> int:
    """Prove the survey can distinguish every shape it claims to — and can
    return NON-zero. A census that cannot produce a finding on a planted case
    is indistinguishable from a clean tree (`zeroIsAClaim`)."""
    cases = [
        ("flat cascading", {"gap": {"type": "string"}, "gapTablet": {"type": "string"},
                            "gapMobile": {"type": "string"}}, "flat_tiers", "cascading_value"),
        ("both shapes", {"splitImage": {"type": "object"}, "splitImageTablet": {"type": "object"}},
         "both_shapes", "asset_like"),
        ("orphan tier", {"fooTablet": {"type": "string"}}, "orphan_tier", "orphan"),
        ("asset hint", {"videoUrl": {"type": "string"}, "videoUrlTablet": {"type": "string"}},
         "flat_tiers", "asset_like"),
        ("flag hint", {"hideOn": {"type": "boolean"}, "hideOnTablet": {"type": "boolean"}},
         "flat_tiers", "flag_like"),
        ("box family", {"padding": {"type": "object"}, "paddingTablet": {"type": "object"}},
         "both_shapes", "box_family"),
    ]
    passed = failed = 0
    for name, attrs, want_shape, want_hint in cases:
        got = scan_attributes(attrs)
        if not got:
            print(f"  FAIL {name}: produced NO finding")
            failed += 1
            continue
        f = got[0]
        if f["shape"] == want_shape and f["hint"] == want_hint:
            print(f"  PASS {name}: shape={f['shape']} hint={f['hint']}")
            passed += 1
        else:
            print(f"  FAIL {name}: got shape={f['shape']} hint={f['hint']}, "
                  f"want shape={want_shape} hint={want_hint}")
            failed += 1

    # NEGATIVE CONTROL — a block with no tier siblings must produce NOTHING.
    if scan_attributes({"gap": {"type": "string"}, "colour": {"type": "string"}}):
        print("  FAIL negative control: produced a finding where no tier family exists")
        failed += 1
    else:
        print("  PASS negative control: no tier family -> no finding")
        passed += 1

    print(f"\nSelf-test: {passed} passed, {failed} failed")
    return 1 if failed else 0


def main() -> int:
    args = sys.argv[1:]
    if "--self-test" in args:
        return self_test()

    result = survey(BLOCKS_DIR)
    if "--json" in args:
        print(json.dumps(result, indent=2))
        return 0

    fs = result["findings"]
    by_shape: dict[str, int] = {}
    by_hint: dict[str, int] = {}
    for f in fs:
        by_shape[f["shape"]] = by_shape.get(f["shape"], 0) + 1
        by_hint[f["hint"]] = by_hint.get(f["hint"], 0) + 1

    print(f"[survey-responsive-shape] {result['blocks_scanned']} block(s) scanned, "
          f"{len(fs)} tier family(ies) found\n")
    print("BY STORAGE SHAPE")
    for k in ("flat_tiers", "both_shapes", "orphan_tier"):
        print(f"  {k:<14} {by_shape.get(k, 0)}")
    print("\nBY TRIAGE HINT (a hint, never a verdict — triage per family)")
    for k in ("cascading_value", "asset_like", "flag_like", "box_family", "orphan"):
        print(f"  {k:<18} {by_hint.get(k, 0)}")

    print("\nMIGRATION CANDIDATES — flat cascading values, the real work-list:")
    cands: dict[str, list[str]] = {}
    for f in fs:
        if f["shape"] == "flat_tiers" and f["hint"] == "cascading_value":
            cands.setdefault(f["block"], []).append(f["base"])
    for block, bases in sorted(cands.items(), key=lambda x: -len(x[1])):
        print(f"  {block:<28} {len(bases):>3}  {', '.join(sorted(bases)[:6])}"
              f"{' …' if len(bases) > 6 else ''}")
    print(f"\n  {len(cands)} block(s), {sum(len(v) for v in cands.values())} family(ies).")
    print("\n⛔ CENSUS ONLY — no --check, never in prebuild. A flat family is a")
    print("   CANDIDATE, not a defect: per-tier ASSETS and independent per-device")
    print("   FLAGS are correct as-is and must not be migrated blindly.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
