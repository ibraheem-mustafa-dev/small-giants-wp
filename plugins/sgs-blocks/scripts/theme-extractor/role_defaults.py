"""Role defaults: a framework slug the draft gives no colour follows the client's own colours (Spec 48 FR-33-2).

A snapshot carries every framework slug (Spec 32 section 14.2), but a draft only colours the roles it uses.
A slug no draft token, README row, measurement or confirmed intake mark set still holds the framework
file's hex, which is another site's colour. ``apply_role_defaults`` replaces each such slug with the
client's colour for the related slug named in ``palette_vocab.ROLE_DEFAULT_TABLE`` (``section-text``
takes the client's ``text``), when that related slug carries a colour from this draft; a table slug the
palette lacks (a token palette replaces the framework one) is added the same way. A slug that follows
an advisory (guessed) colour is advisory too, carrying the framework hex as ``_baseline_color``, so the
push step restores it with its source. Each change is
traced with the WCAG ratio on the ground the slug is read on; a ratio under 4.5:1 is traced as such for
the snapshot gates and Bean's review to catch. Nothing here names a client.
"""
from __future__ import annotations

import pathlib
import sys

from palette_vocab import MIN_TEXT_CONTRAST, ROLE_DEFAULT_GROUND, ROLE_DEFAULT_TABLE, trace_row

_SCRIPTS = pathlib.Path(__file__).resolve().parent.parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))
from snapshot_palette_roster import contrast_ratio  # noqa: E402


def _from_draft(entry: dict | None) -> bool:
    """True when the entry's colour came from this draft or from Bean (any ``_source``), not the framework file."""
    return isinstance(entry, dict) and bool(entry.get("_source")) and isinstance(entry.get("color"), str)


def _framework_held(entry: dict | None, framework_hex: dict[str, str]) -> bool:
    """True when the entry is the untouched framework copy: no ``_source`` and the framework file's colour."""
    if not isinstance(entry, dict) or entry.get("_source"):
        return False
    held = framework_hex.get(entry.get("slug"))
    return isinstance(held, str) and str(entry.get("color", "")).lower() == held.lower()


def apply_role_defaults(snap: dict, baseline: dict, trace: list) -> dict:
    """Point every framework-held or missing role slug at the client's related colour. Mutates and returns
    ``snap``; a missing slug is added, because every snapshot carries the framework roster."""
    palette = snap.setdefault("settings", {}).setdefault("color", {}).setdefault("palette", [])
    by_slug = {e.get("slug"): e for e in palette if isinstance(e, dict)}
    framework = [e for e in (((baseline.get("settings") or {}).get("color") or {}).get("palette") or [])
                 if isinstance(e, dict) and e.get("slug") and isinstance(e.get("color"), str)]
    framework_hex = {e["slug"]: e["color"] for e in framework}
    framework_name = {e["slug"]: e.get("name") or e["slug"] for e in framework}
    for slug, follows in ROLE_DEFAULT_TABLE:
        entry, source = by_slug.get(slug), by_slug.get(follows)
        missing = entry is None and slug in framework_hex
        if not (missing or _framework_held(entry, framework_hex)) or not _from_draft(source):
            continue
        if missing:
            entry = {"slug": slug, "color": framework_hex[slug], "name": framework_name[slug]}
            palette.append(entry)
            by_slug[slug] = entry
        old, value = entry["color"], source["color"]
        entry["color"] = value
        entry["_source"] = "derived"
        if source.get("advisory"):
            # A guessed source (FR-33-5) makes its follower a guess too: the push restores both together.
            entry["advisory"] = True
            entry["_baseline_color"] = framework_hex[slug]
        ground_slug = ROLE_DEFAULT_GROUND.get(slug)
        ground = by_slug.get(ground_slug, {}).get("color") if ground_slug else None
        ratio = contrast_ratio(value, ground) if isinstance(ground, str) else None
        verdict = "" if ratio is None else (
            f"; {ratio:.2f}:1 on {ground_slug}" + ("" if ratio >= MIN_TEXT_CONTRAST else
                                                   f", below {MIN_TEXT_CONTRAST}:1"))
        trace_row(trace, "derive", f"palette.{slug}",
                  f"role default: no draft colour for {slug}, so it follows the client's {follows} "
                  f"instead of the framework {old}{' (the slug was missing)' if missing else ''}{verdict}",
                  value, _source="derived")
    return snap
