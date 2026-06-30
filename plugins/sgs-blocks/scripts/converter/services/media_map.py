"""media_map.py — loader for the run-time media-map JSON.

The media-map shape (keyed by basename):
    { "<basename>": {"url": "<wp-url>", "id": <int>, "alt": "<alt>"} }

Consumed by resolve_media_url (lift_helpers.py:133) which does the basename
lookup and returns the WP URL on hit, or the original src on miss (Spec 31
§3.B1 faithful no-op — gaps are a separate tracking concern, not a loader concern).
"""
from __future__ import annotations

import json
import pathlib


def load_media_map(path: str | None) -> dict:
    """Load a run's media-map JSON (basename -> {url,id,alt}) for resolve_media_url.

    Returns {} when path is None or the file does not exist (safe no-op — the
    new engine has no production media-map driver yet; an empty map means image
    srcs stay un-remapped, a tracked dependency NOT a silent completeness claim).
    NO url-shape heuristic (R-31-1 / Spec 31 §3.B1) — only the explicit JSON map.
    """
    if path is None:
        return {}
    file_path = pathlib.Path(path)
    if not file_path.exists():
        return {}
    try:
        with open(file_path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return {}
    if not data:
        return {}
    return data
