"""snapshot_layout_tokens.py: the per-tier layout tokens every client snapshot must carry (Spec 32 FR-32-15).

One importable home for the rule, shared by the migration (`migrate-section-gutter-tokens.py`) and the push
guard (`push-theme-snapshot.py::roster_guard`):

  * the tokens are the leaves of `settings.custom.section` and `settings.custom.gutter` in the framework
    `theme/sgs-theme/theme.json` (`section.padding.{mobile,tablet,desktop}` and `gutter.{mobile,tablet,desktop}`),
    printed by WordPress as `--wp--custom--section--padding--{tier}` and `--wp--custom--gutter--{tier}`;
  * a snapshot replaces theme.json wholesale, so each one must carry every token (extras allowed);
  * what a snapshot renders today: the gutter is its root side padding (`styles.spacing.padding.left`, a preset
    reference written as the CSS variable), or 0 when it sets none; section padding is 0 (a container with no
    padding of its own paints none).

No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRAMEWORK_THEME_JSON = REPO_ROOT / "theme" / "sgs-theme" / "theme.json"
TOKEN_ROOTS = ("section", "gutter")
TIERS = ("mobile", "tablet", "desktop")

_PRESET_PIPE = re.compile(r"^var:preset\|spacing\|([a-z0-9-]+)$")


def _leaves(node: object, prefix: tuple[str, ...]) -> list[tuple[str, ...]]:
    if isinstance(node, dict):
        out: list[tuple[str, ...]] = []
        for key, value in node.items():
            out.extend(_leaves(value, prefix + (key,)))
        return out
    return [prefix]


def framework_layout_tokens(theme_json: Path | None = None) -> list[str]:
    """Dotted paths under settings.custom (e.g. `section.padding.mobile`) the framework declares, file order."""
    data = json.loads((theme_json or FRAMEWORK_THEME_JSON).read_text(encoding="utf-8"))
    custom = (data.get("settings") or {}).get("custom") or {}
    paths: list[str] = []
    for root in TOKEN_ROOTS:
        if root in custom:
            paths.extend(".".join(p) for p in _leaves(custom[root], (root,)))
    return paths


def token_value(snapshot: dict, path: str) -> object:
    """The value at `settings.custom.<path>`, or None when any step is missing."""
    node: object = (snapshot.get("settings") or {}).get("custom") or {}
    for key in path.split("."):
        if not isinstance(node, dict) or key not in node:
            return None
        node = node[key]
    return node


def missing_layout_tokens(snapshot: dict, required: list[str]) -> list[str]:
    """Required token paths the snapshot does not carry as a non-empty string (required order)."""
    out = []
    for path in required:
        value = token_value(snapshot, path)
        if not isinstance(value, str) or not value.strip():
            out.append(path)
    return out


def css_length(value: object) -> str | None:
    """A theme.json spacing value as CSS: `var:preset|spacing|40` becomes its variable; a length passes through."""
    if not isinstance(value, str) or not value.strip():
        return None
    v = value.strip()
    m = _PRESET_PIPE.match(v)
    return f"var(--wp--preset--spacing--{m.group(1)})" if m else v


def todays_values(snapshot: dict) -> dict[str, str]:
    """The token values that keep what the snapshot renders today, keyed by dotted path."""
    padding = ((snapshot.get("styles") or {}).get("spacing") or {}).get("padding") or {}
    side = padding.get("left") if isinstance(padding, dict) else None
    gutter = css_length(side) or "0"
    values = {f"section.padding.{tier}": "0" for tier in TIERS}
    values.update({f"gutter.{tier}": gutter for tier in TIERS})
    return values
