#!/usr/bin/env python3
"""
Spec 35 FR-35-3 — assert that every css:* setting row belongs to exactly one cluster.

Project rule, Bean-ruled 2026-07-20: "a setting must apply to or impact something, so
unclustered is always wrong." This script makes that structural.

A css:* row counts as COVERED if its setting_key is either:
  (a) a member `key` in any cluster, OR
  (b) listed in any member's optional `absorbs` array.

The `absorbs` rule exists because merged members subsume other rows — e.g. `css:padding`
absorbs `css:padding-top/right/bottom/left`, since the shared BoxControl already covers
them. Handle `absorbs` being absent on most members — it is optional.

ERRORS (exit 1) if:
1. A css:* row is not covered (not a member key, not absorbed).
2. A member key does not exist as a row in setting-registry.json (typo guard).
3. A key appears as a member in more than one cluster (a row must map to exactly ONE).
4. A key is both a member key AND in another member's absorbs list (contradiction).

Exit 0 with a one-line success summary when all pass.
"""
import argparse
import json
import sys
from pathlib import Path

# Windows console fix for unicode output
if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")


def load_json(fpath: Path, name: str) -> dict:
    """Load and parse a JSON file with proper error handling and utf-8 encoding."""
    if not fpath.exists():
        sys.exit(f"FATAL: {name} not found at {fpath}")
    try:
        with open(fpath, encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        sys.exit(f"FATAL: {name} is malformed JSON: {e}")
    except Exception as e:
        sys.exit(f"FATAL: Cannot read {name}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Spec 35 FR-35-3 — assert every css:* setting row belongs to exactly one cluster."
    )
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON result")
    args = parser.parse_args()

    # Resolve paths relative to this script's location
    script_dir = Path(__file__).resolve().parent
    setting_registry_path = script_dir / "setting-registry.json"
    cluster_sets_path = script_dir / "cluster-member-sets.json"

    # Load both files
    registry = load_json(setting_registry_path, "setting-registry.json")
    clusters = load_json(cluster_sets_path, "cluster-member-sets.json")

    # Extract rows from registry, filter to css:* only
    rows = registry.get("rows", [])
    css_rows = {r.get("setting_key"): r for r in rows if r.get("setting_key", "").startswith("css:")}

    if not css_rows:
        sys.exit("FATAL: No css:* rows found in setting-registry.json")

    # Build coverage map: key -> (cluster_name, member_index)
    key_to_cluster = {}  # key -> cluster_name
    key_to_absorbs = {}  # key -> set of absorbed keys
    errors = []

    cluster_order = clusters.get("order", [])
    cluster_dict = clusters.get("clusters", {})

    # Process each cluster and its members
    for cluster_name in cluster_order:
        cluster = cluster_dict.get(cluster_name, {})
        members = cluster.get("members", [])

        for member_idx, member in enumerate(members):
            member_key = member.get("key")

            # Typo guard: member key must exist in setting-registry
            if member_key not in css_rows:
                errors.append(f"Member key '{member_key}' in cluster '{cluster_name}' does not exist in setting-registry.json")
                continue

            # Guard: key can only be in one cluster
            if member_key in key_to_cluster:
                prev_cluster = key_to_cluster[member_key]
                errors.append(f"Key '{member_key}' appears as a member in both '{prev_cluster}' and '{cluster_name}' clusters")
                continue

            key_to_cluster[member_key] = cluster_name

            # Track absorbed keys (if present)
            absorbs = member.get("absorbs", [])
            if absorbs:
                key_to_absorbs[member_key] = set(absorbs)

    # Guard: a key cannot be both a member AND absorbed by another member
    for absorber_key, absorbed_set in key_to_absorbs.items():
        for absorbed_key in absorbed_set:
            if absorbed_key in key_to_cluster:
                absorber_cluster = key_to_cluster[absorber_key]
                errors.append(f"Key '{absorbed_key}' is both a member key (in '{absorber_cluster}') and absorbed by '{absorber_key}' (contradiction)")

    # Main coverage check: every css:* row must be either a member or absorbed
    uncovered = []
    for setting_key in css_rows.keys():
        is_member = setting_key in key_to_cluster
        is_absorbed = any(setting_key in key_to_absorbs.get(m, set()) for m in key_to_cluster.keys())

        if not (is_member or is_absorbed):
            uncovered.append(setting_key)

    if uncovered:
        errors.extend(uncovered)

    # Output
    total_css = len(css_rows)
    total_absorbed = sum(len(v) for v in key_to_absorbs.values())

    if args.json:
        result = {
            "success": len(errors) == 0 and len(uncovered) == 0,
            "total_css_rows": total_css,
            "total_absorbed": total_absorbed,
            "total_members": total_css - total_absorbed,
            "errors": errors,
            "uncovered": uncovered,
        }
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["success"] else 1)
    else:
        if errors or uncovered:
            for err in errors:
                print(err)
            sys.exit(1)

        # Success
        print(f"✓ All {total_css} css:* rows covered ({total_css - total_absorbed} members + {total_absorbed} absorbed)")
        sys.exit(0)


if __name__ == "__main__":
    main()
