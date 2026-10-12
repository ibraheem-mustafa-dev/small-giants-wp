"""snapshot_motion_tokens.py: the motion tokens every client snapshot must carry (Spec 38A section 7, FR-38A-14, FR-38A-15).

One importable home for the rule, shared by the push guard (`push-theme-snapshot.py::roster_guard`) and the
consumer checker (`check-motion-token-consumers.py`):

  * the tokens are the keys of `x-sgs-tokens` in `plugins/sgs-blocks/schemas/motion.schema.json` (dotted paths under
    `settings.custom`, for example `duration.fast`), printed by WordPress as the `cssVar` the same entry names;
  * a snapshot replaces theme.json wholesale, so each one must carry every token (extras allowed);
  * the section 7 bands bind the framework `theme/sgs-theme/theme.json` only; a client snapshot carries its own
    draft's values under the same keys and may sit outside a band.

No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
MOTION_SCHEMA = REPO_ROOT / "plugins" / "sgs-blocks" / "schemas" / "motion.schema.json"
FRAMEWORK_THEME_JSON = REPO_ROOT / "theme" / "sgs-theme" / "theme.json"


def motion_token_table(schema_path: Path | None = None) -> dict[str, dict]:
    """The `x-sgs-tokens` table: dotted token key -> {band, usedBy, cssVar}, schema order."""
    data = json.loads((schema_path or MOTION_SCHEMA).read_text(encoding="utf-8"))
    return dict(data.get("x-sgs-tokens") or {})


def motion_token_keys(schema_path: Path | None = None) -> list[str]:
    """Dotted paths under settings.custom (for example `distance.sm`) the motion schema declares, schema order."""
    return list(motion_token_table(schema_path))


def token_value(snapshot: dict, path: str) -> object:
    """The value at `settings.custom.<path>`, or None when any step is missing."""
    node: object = (snapshot.get("settings") or {}).get("custom") or {}
    for key in path.split("."):
        if not isinstance(node, dict) or key not in node:
            return None
        node = node[key]
    return node


def missing_motion_tokens(snapshot: dict, required: list[str]) -> list[str]:
    """The required motion tokens the snapshot lacks (absent, null or blank), in `required` order."""
    missing: list[str] = []
    for path in required:
        value = token_value(snapshot, path)
        if not isinstance(value, str) or not value.strip():
            missing.append(path)
    return missing
