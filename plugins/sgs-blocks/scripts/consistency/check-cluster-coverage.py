#!/usr/bin/env python3
"""
Spec 35 FR-35-3 — assert that every css:* and anim:* setting row belongs to exactly one cluster.

Project rule, Bean-ruled 2026-07-20: "a setting must apply to or impact something, so
unclustered is always wrong." This script makes that structural.

A css:* or anim:* row counts as COVERED if its setting_key is either:
  (a) a member `key` in any cluster, OR
  (b) listed in any member's optional `absorbs` array.

TWO SCOPES, deliberately different (widened 2026-08-09, Bean placement ruling):
  COVERAGE  is required of css:* and anim:* rows ONLY. An input:* row describes an
            input TYPE, not a painted property, so it is never required to belong to
            a cluster.
  TYPO GUARD validates a member key against EVERY row in the registry, not just the
            css:*/anim:* subset. Before this, a member keyed to a real input:* row was
            rejected as a typo, which made a whole class of genuine setting unhomeable:
            hero's background VIDEO and raw-SVG sources have no CSS property to name
            (a <video> element and inline markup), and `input:media-source` +
            `input:code-svg` already existed to describe them. The old guard forced the
            choice between fabricating a `css:background-video` row — which would have
            passed this gate while putting a lie in the golden master — and leaving the
            controls homeless. Neither was acceptable, so the guard was scoped correctly
            instead. Coverage is unchanged and still fails closed.

The `absorbs` rule exists because merged members subsume other rows — e.g. `css:padding`
absorbs `css:padding-top/right/bottom/left`, since the shared BoxControl already covers
them. Handle `absorbs` being absent on most members — it is optional.

ERRORS (exit 1) if:
1. A css:* or anim:* row is not covered (not a member key, not absorbed).
2. A member key does not exist as a row in setting-registry.json (typo guard).
3. A key appears as a member in more than one cluster (a row must map to exactly ONE).
4. A key is both a member key AND in another member's absorbs list (contradiction).

Exit 0 with a one-line success summary when all pass.

Run `--self-test` to prove this gate can still FAIL. A gate that cannot fail reads green
forever; the self-test exercises each error class above plus the two scopes, so a future
edit that quietly widens the typo guard into "accept anything" is caught here.
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


def _collect_members(clusters: dict, all_rows: dict) -> tuple[dict, dict, list]:
    """Walk every cluster's members -> (key_to_cluster, key_to_absorbs, errors)."""
    key_to_cluster = {}
    key_to_absorbs = {}
    errors = []

    for cluster_name in clusters.get("order", []):
        cluster = clusters.get("clusters", {}).get(cluster_name, {})

        for member in cluster.get("members", []):
            member_key = member.get("key")

            # Typo guard: member key must exist in setting-registry — ANY namespace.
            # Scoped to all_rows, not css_anim_rows: an input:* row is a legitimate
            # member (see module docstring), a misspelling of one is not.
            if member_key not in all_rows:
                errors.append(
                    f"Member key '{member_key}' in cluster '{cluster_name}' does not exist in setting-registry.json"
                )
                continue

            # Guard: key can only be in one cluster
            if member_key in key_to_cluster:
                prev_cluster = key_to_cluster[member_key]
                errors.append(
                    f"Key '{member_key}' appears as a member in both '{prev_cluster}' and '{cluster_name}' clusters"
                )
                continue

            key_to_cluster[member_key] = cluster_name

            absorbs = member.get("absorbs", [])
            if absorbs:
                key_to_absorbs[member_key] = set(absorbs)

    return key_to_cluster, key_to_absorbs, errors


def run_checks(registry: dict, clusters: dict) -> dict:
    """Pure check pass — no I/O, no exit. Returns a result dict.

    Split out from main() so the self-test can drive it with in-memory fixtures
    instead of writing temp files.
    """
    rows = registry.get("rows", [])
    # TWO scopes (see module docstring):
    #   all_rows      -> the TYPO GUARD's vocabulary (every registered setting)
    #   css_anim_rows -> the COVERAGE requirement (only painted properties)
    all_rows = {r.get("setting_key"): r for r in rows if r.get("setting_key")}
    css_anim_rows = {k: v for k, v in all_rows.items() if k.startswith(("css:", "anim:"))}

    if not css_anim_rows:
        return {"fatal": "No css:* or anim:* rows found in setting-registry.json"}

    key_to_cluster, key_to_absorbs, errors = _collect_members(clusters, all_rows)

    # Guard: a key cannot be both a member AND absorbed by another member
    for absorber_key, absorbed_set in key_to_absorbs.items():
        for absorbed_key in absorbed_set:
            if absorbed_key in key_to_cluster:
                absorber_cluster = key_to_cluster[absorber_key]
                errors.append(
                    f"Key '{absorbed_key}' is both a member key (in '{absorber_cluster}') and absorbed by '{absorber_key}' (contradiction)"
                )

    # Main coverage check — css:*/anim:* ONLY. input:* rows are never required here.
    uncovered = []
    for setting_key in css_anim_rows:
        is_member = setting_key in key_to_cluster
        is_absorbed = any(setting_key in absorbed for absorbed in key_to_absorbs.values())
        if not (is_member or is_absorbed):
            uncovered.append(setting_key)

    total_absorbed = sum(len(v) for v in key_to_absorbs.values())
    return {
        "fatal": None,
        "errors": errors + uncovered,
        "uncovered": uncovered,
        "total_css_anim_rows": len(css_anim_rows),
        "total_absorbed": total_absorbed,
        "total_members": len(css_anim_rows) - total_absorbed,
    }


def _fixture(row_keys, members_by_cluster):
    """Build a minimal (registry, clusters) pair for the self-test."""
    registry = {"rows": [{"setting_key": k, "category": "x"} for k in row_keys]}
    clusters = {
        "order": list(members_by_cluster),
        "clusters": {c: {"members": m} for c, m in members_by_cluster.items()},
    }
    return registry, clusters


def _self_test() -> int:
    """Prove each error class still bites, and that the two scopes differ correctly."""
    cases = []

    # 1. NEGATIVE CONTROL — a clean set must pass.
    reg, clu = _fixture(["css:a", "anim:b"], {"fill": [{"key": "css:a"}, {"key": "anim:b"}]})
    cases.append(("clean set passes", run_checks(reg, clu)["errors"] == [], True))

    # 2. Uncovered css:* row must ERROR (the core coverage requirement).
    reg, clu = _fixture(["css:a", "css:orphan"], {"fill": [{"key": "css:a"}]})
    cases.append(("uncovered css:* row is caught", "css:orphan" in run_checks(reg, clu)["errors"], True))

    # 3. TYPO GUARD must still bite on a key that exists in NO row. This is the
    #    assertion that the 2026-08-09 widening did not become "accept anything".
    reg, clu = _fixture(["css:a"], {"fill": [{"key": "css:a"}, {"key": "css:tpyo"}]})
    errs = run_checks(reg, clu)["errors"]
    cases.append(("typo guard catches an unregistered key", any("does not exist" in e for e in errs), True))

    # 4. A key in two clusters must ERROR.
    reg, clu = _fixture(["css:a"], {"fill": [{"key": "css:a"}], "layout": [{"key": "css:a"}]})
    errs = run_checks(reg, clu)["errors"]
    cases.append(("same key in two clusters is caught", any("appears as a member in both" in e for e in errs), True))

    # 5. Member AND absorbed must ERROR (contradiction).
    reg, clu = _fixture(["css:a", "css:b"], {"fill": [{"key": "css:a", "absorbs": ["css:b"]}, {"key": "css:b"}]})
    errs = run_checks(reg, clu)["errors"]
    cases.append(("member-and-absorbed contradiction is caught", any("contradiction" in e for e in errs), True))

    # 6. NEW SCOPE, positive: an input:* row IS a legal member key.
    reg, clu = _fixture(["css:a", "input:media-source"],
                        {"fill": [{"key": "css:a"}, {"key": "input:media-source"}]})
    cases.append(("input:* row is a legal member", run_checks(reg, clu)["errors"] == [], True))

    # 7. NEW SCOPE, negative: an UNCLUSTERED input:* row must NOT be reported —
    #    coverage is a css/anim requirement only.
    reg, clu = _fixture(["css:a", "input:lonely"], {"fill": [{"key": "css:a"}]})
    cases.append(("unclustered input:* row is not required to be covered",
                  run_checks(reg, clu)["errors"] == [], True))

    failed = [name for name, got, want in cases if got != want]
    for name, got, want in cases:
        print(f"  [{'PASS' if got == want else 'FAIL'}] {name}")
    if failed:
        print(f"\nself-test: FAIL — {len(failed)} case(s): {failed}")
        return 1
    print(f"\nself-test: PASS ({len(cases)} cases — coverage, typo guard, dual-cluster, "
          "absorb contradiction, and both sides of the css/anim-vs-input scope split)")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Spec 35 FR-35-3 — assert every css:* and anim:* setting row belongs to exactly one cluster."
    )
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON result")
    parser.add_argument("--self-test", action="store_true", help="Prove this gate can still fail")
    args = parser.parse_args()

    if args.self_test:
        sys.exit(_self_test())

    script_dir = Path(__file__).resolve().parent
    registry = load_json(script_dir / "setting-registry.json", "setting-registry.json")
    clusters = load_json(script_dir / "cluster-member-sets.json", "cluster-member-sets.json")

    result = run_checks(registry, clusters)
    if result.get("fatal"):
        sys.exit(f"FATAL: {result['fatal']}")

    errors = result["errors"]
    total_css_anim = result["total_css_anim_rows"]
    total_absorbed = result["total_absorbed"]

    if args.json:
        payload = {
            "success": not errors,
            "total_css_anim_rows": total_css_anim,
            "total_absorbed": total_absorbed,
            "total_members": result["total_members"],
            "errors": errors,
            "uncovered": result["uncovered"],
        }
        print(json.dumps(payload, indent=2))
        sys.exit(0 if payload["success"] else 1)

    if errors:
        for err in errors:
            print(err)
        sys.exit(1)

    print(f"✓ All {total_css_anim} css:* and anim:* rows covered ({total_css_anim - total_absorbed} members + {total_absorbed} absorbed)")
    sys.exit(0)


if __name__ == "__main__":
    main()
