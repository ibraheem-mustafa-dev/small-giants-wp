#!/usr/bin/env python3
"""variation_router.py -- Spec 15 Phase 5d.3 per-client variation routing.

Per Spec 15 Â§4.7: token discoveries land in the CLIENT's style variation
JSON, NEVER in root theme.json. Style variations override per client;
slugs stay constant across the framework.

This module is the SINGLE write path for token additions / updates
during /sgs-clone. Hard guards prevent any code path from mutating
the canonical theme/sgs-theme/theme.json (the framework default).

Variation files live at `theme/sgs-theme/styles/<client-slug>.json`.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_THEME_ROOT = Path("theme/sgs-theme")


class VariationRouterError(RuntimeError):
    pass


def variation_path(client_slug: str, theme_root: Path = DEFAULT_THEME_ROOT) -> Path:
    if not client_slug or "/" in client_slug or ".." in client_slug:
        raise VariationRouterError(f"invalid client_slug: {client_slug!r}")
    return theme_root / "styles" / f"{client_slug}.json"


def root_theme_path(theme_root: Path = DEFAULT_THEME_ROOT) -> Path:
    return theme_root / "theme.json"


def _load_variation(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    # Minimal scaffold for a brand-new variation file.
    return {
        "$schema": "https://schemas.wp.org/trunk/theme.json",
        "version": 3,
        "title": path.stem.replace("-", " ").title(),
        "settings": {},
    }


# Role -> theme.json settings path + identifier key + value key.
# Each registry slice within `settings.<area>.<list>` is a list of dicts
# keyed by `slug`. Adding a token = upsert by slug.
_ROLE_TO_REGISTRY: dict[str, dict] = {
    "color":     {"path": ["color", "palette"],            "value_key": "color"},
    "spacing":   {"path": ["spacing", "spacingSizes"],     "value_key": "size"},
    "font_size": {"path": ["typography", "fontSizes"],     "value_key": "size"},
    "shadow":    {"path": ["shadow", "presets"],           "value_key": "shadow"},
    "family":    {"path": ["typography", "fontFamilies"],  "value_key": "fontFamily"},
}


def _navigate_or_create(root: dict, keys: list[str]) -> list[dict]:
    """Walk into settings.<area>.<list>; create empty containers as needed."""
    settings = root.setdefault("settings", {})
    area = settings.setdefault(keys[0], {})
    bucket = area.setdefault(keys[1], [])
    if not isinstance(bucket, list):
        raise VariationRouterError(
            f"variation file already has non-list at settings.{keys[0]}.{keys[1]}"
        )
    return bucket


def add_token(
    client_slug: str,
    role: str,
    slug: str,
    value: Any,
    name: str | None = None,
    theme_root: Path = DEFAULT_THEME_ROOT,
    write: bool = False,
) -> dict:
    """Add or update a token in the CLIENT'S variation file.

    Returns a structured report:
        {
          "client_slug":  ...,
          "role":         ...,
          "slug":         ...,
          "action":       "inserted" | "updated" | "noop",
          "variation_path": <str>,
          "mode":         "write" | "dry-run",
          "root_theme_untouched": True,   # FR21 guard
        }

    HARD GUARD: `root_theme_untouched=True` is always returned. Code that
    discovers a non-write path against root theme.json raises.
    """
    if role not in _ROLE_TO_REGISTRY:
        raise VariationRouterError(
            f"unknown role {role!r} -- must be one of {list(_ROLE_TO_REGISTRY)}"
        )
    cfg = _ROLE_TO_REGISTRY[role]
    target_path = variation_path(client_slug, theme_root=theme_root)
    root_path = root_theme_path(theme_root=theme_root)

    # FR21 guard: target MUST NOT be root theme.json.
    if target_path.resolve() == root_path.resolve():
        raise VariationRouterError("refusing to mutate root theme.json")

    variation = _load_variation(target_path)
    bucket = _navigate_or_create(variation, cfg["path"])
    # Upsert by slug
    existing_idx = next((i for i, e in enumerate(bucket) if e.get("slug") == slug), None)
    new_entry: dict[str, Any] = {"slug": slug, cfg["value_key"]: value}
    if name:
        new_entry["name"] = name
    action: str
    if existing_idx is None:
        bucket.append(new_entry)
        action = "inserted"
    else:
        prev = bucket[existing_idx]
        if prev.get(cfg["value_key"]) == value and (name is None or prev.get("name") == name):
            action = "noop"
        else:
            bucket[existing_idx] = {**prev, **new_entry}
            action = "updated"

    if write and action != "noop":
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(json.dumps(variation, indent=2, ensure_ascii=False),
                               encoding="utf-8")

    return {
        "client_slug":          client_slug,
        "role":                 role,
        "slug":                 slug,
        "action":               action,
        "variation_path":       str(target_path),
        "mode":                 "write" if write else "dry-run",
        "root_theme_untouched": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--client", required=True)
    parser.add_argument("--role", required=True, choices=list(_ROLE_TO_REGISTRY))
    parser.add_argument("--slug", required=True)
    parser.add_argument("--value", required=True)
    parser.add_argument("--name", default=None)
    parser.add_argument("--theme-root", type=Path, default=DEFAULT_THEME_ROOT)
    parser.add_argument("--write", action="store_true",
                        help="Persist write to variation JSON (default: dry-run)")
    args = parser.parse_args(argv)
    report = add_token(args.client, args.role, args.slug, args.value,
                       name=args.name, theme_root=args.theme_root, write=args.write)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
