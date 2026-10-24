"""patch_merge.py — lay a Fill snapshot patch over an extracted snapshot (FR-33-1).

Fill writes the values it settles (``{settings:{custom:{focus:{...}}}}``) in the snapshot's own shape and never edits
the client's snapshot. ``apply_patch`` deep-merges that file onto the extracted one: objects merge key by key, a
scalar or an array replaces, and a path the snapshot lacks is created.
"""
from __future__ import annotations

import copy
import json
import pathlib


def deep_merge(dst: dict, patch: dict, path: str, set_paths: list) -> None:
    """Merge ``patch`` into ``dst``; ``set_paths`` collects the dotted path of every leaf the patch wrote."""
    for key, value in patch.items():
        here = f"{path}.{key}" if path else key
        if isinstance(value, dict) and value:
            if not isinstance(dst.get(key), dict):
                dst[key] = {}
            deep_merge(dst[key], value, here, set_paths)
        else:
            dst[key] = copy.deepcopy(value)
            set_paths.append(here)


def apply_patch(snap: dict, patch_file, trace: list) -> list:
    """Merge the JSON object in ``patch_file`` onto ``snap``; print and trace the paths it set."""
    path = pathlib.Path(patch_file)
    patch = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(patch, dict):
        raise SystemExit(f"HALT: patch {path} is not a JSON object")
    set_paths: list = []
    deep_merge(snap, patch, "", set_paths)
    print(f"  patch {path.name}: set {len(set_paths)} path(s)")
    for p in set_paths:
        print(f"    {p}")
        trace.append({"kind": "patch", "what": p, "_source": "patch", "reason": f"--patch {path.name}"})
    return set_paths
