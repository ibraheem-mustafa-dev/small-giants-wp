"""mirror_theme_json.py: write the theme.json a local mirror must run, the same bytes a deploy ships to the test site it copies.

Usage: python3 scripts/local-wp/mirror_theme_json.py <local-site> <out-file>

The mirror's test site is its `mirrorOf` in scripts/computed-route/calibration-targets.json. Its theme.json is chosen by
plugins/sgs-blocks/scripts/deploy_guards.py::resolve_theme_json_payload from that test site's TARGETS entry
(deploy_common.py): the client's theme-snapshot.json prepared as push-theme-snapshot.py prepares it, or the framework
theme.json when the target names no client. Calibration measures default paint on the mirror under the paint key of
that client's snapshot (scripts/computed-route/lib/cache.mjs), so the mirror must run those exact bytes. Exit 1 with
the reason when the mirror, its test site or the payload cannot be resolved; nothing is written then.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "plugins" / "sgs-blocks" / "scripts"))

import deploy_common  # noqa: E402
import deploy_guards  # noqa: E402


def payload_for(mirror: str) -> tuple[bytes | None, str]:
    """(the theme.json bytes for the mirror, a label) or (None, the reason it cannot be resolved)."""
    targets = json.loads((REPO / "scripts" / "computed-route" / "calibration-targets.json").read_text(encoding="utf-8"))
    test_site = (targets.get(mirror) or {}).get("mirrorOf")
    if not test_site:
        return None, f"{mirror} has no mirrorOf in calibration-targets.json"
    target = deploy_common.TARGETS.get(test_site)
    if target is None:
        return None, f"{mirror} mirrors {test_site}, which is not a deploy target in deploy_common.py"
    data, label = deploy_guards.resolve_theme_json_payload(target, REPO)
    return data, f"{label} (as deployed to {test_site})"


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        return 2
    data, label = payload_for(argv[0])
    if data is None:
        print(f"mirror_theme_json: {label}", file=sys.stderr)
        return 1
    Path(argv[1]).write_bytes(data)
    print(f"theme.json: {label}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
