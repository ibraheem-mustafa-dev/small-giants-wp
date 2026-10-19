"""confirmed_palette.py — apply Bean's confirmed palette roles to the snapshot (Spec 48 FR-33-2).

The extractor proposes a slug for each draft token; intake shows those proposals to Bean, who marks
each ``palette-role`` row in ``intake.json``'s ``review[]``:

  ``accept``        take the row's proposed ``role`` (a ``None`` role means no palette entry)
  ``role:<slug>``   use that slug instead
  ``one-off``       no palette entry; the colour stays a literal hex where it is used

``confirmed_map`` turns those marks into ``{slug: {"hex", "tokens"}}``. ``apply_confirmed`` then sets
every confirmed slug to Bean's hex, adds a confirmed slug the palette lacks, and drops a
slug proposed from one of this draft's tokens that no confirmed row names (a token
Bean marked one-off). Any other slug, such as a client slug ``merge_onto`` carried from the existing
snapshot, is kept and logged, because the client's styles may reference it. Every change is logged
to the trace. The step is idempotent, so it can run once on the generated palette and again after
``merge_onto``.
"""
from __future__ import annotations

import re

_CUSTOM_SLUG = re.compile(r"^custom-[a-z0-9]+(?:-[a-z0-9]+)*$")
# Keys that mark a palette entry as an unconfirmed proposal (FR-33-5); a confirmed entry sheds them.
_PROPOSAL_KEYS = ("advisory", "_baseline_color", "confidence")


class ConfirmError(ValueError):
    """The intake marks cannot be applied as they stand; the message names the row and the fix."""


def framework_slugs(baseline: dict) -> dict[str, str]:
    """``{slug: name}`` of the framework palette (``theme/sgs-theme/theme.json``)."""
    pal = ((baseline.get("settings") or {}).get("color") or {}).get("palette") or []
    return {e["slug"]: e.get("name") or e["slug"] for e in pal if isinstance(e, dict) and e.get("slug")}


def _norm_hex(value) -> str | None:
    if not isinstance(value, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", value.strip()):
        return None
    return value.strip().lower()


def confirmed_map(intake: dict, known_slugs) -> tuple[dict[str, dict], list[str]]:
    """Return ``({slug: {"hex": "#rrggbb", "tokens": [...]}}, [unmarked tokens])`` from intake.

    Raises ``ConfirmError`` for a mark on a token intake has no row for, an unrecognised mark, a
    slug that is neither a framework slug nor ``custom-<name>``, a row without a usable hex, or two
    tokens that claim one slug with different hex values.
    """
    rows = {r.get("token"): r for r in ((intake.get("palette") or {}).get("rows") or [])
            if isinstance(r, dict) and r.get("token")}
    marks = {}
    for entry in intake.get("review") or []:
        if not isinstance(entry, dict) or entry.get("rowType") != "palette-role":
            continue
        row_id = entry.get("rowId") or ""
        if not row_id.startswith("palette:"):
            raise ConfirmError(f"palette-role review row has rowId {row_id!r}; expected 'palette:<token>'")
        marks[row_id[len("palette:"):]] = entry.get("mark")

    known = set(known_slugs)
    confirmed: dict[str, dict] = {}
    for token, mark in marks.items():
        row = rows.get(token)
        if row is None:
            raise ConfirmError(f"review marks {token} but intake.palette.rows has no row for it; re-run intake")
        if mark == "one-off":
            continue
        if mark == "accept":
            slug = row.get("role")
            if not slug:
                continue  # the proposal itself was "no palette entry" (an unused token)
        elif isinstance(mark, str) and mark.startswith("role:"):
            slug = mark[len("role:"):].strip()
        else:
            raise ConfirmError(f"{token}: unrecognised palette mark {mark!r} (accept, role:<slug> or one-off)")
        if slug not in known and not _CUSTOM_SLUG.match(slug):
            raise ConfirmError(f"{token}: confirmed slug {slug!r} is neither a framework palette slug "
                               "(theme/sgs-theme/theme.json) nor a custom-<name> slug")
        hexv = _norm_hex(row.get("hex"))
        if hexv is None:
            raise ConfirmError(f"{token}: intake row hex {row.get('hex')!r} is not a #rrggbb colour")
        held = confirmed.get(slug)
        if held and held["hex"] != hexv:
            raise ConfirmError(f"slug {slug!r} is claimed by {', '.join(held['tokens'])} ({held['hex']}) and "
                               f"by {token} ({hexv}); one slug cannot hold two colours")
        confirmed.setdefault(slug, {"hex": hexv, "tokens": []})["tokens"].append(token)
    unmarked = sorted(t for t in rows if t not in marks)
    return confirmed, unmarked


def draft_custom_slugs(intake: dict) -> frozenset[str]:
    """The slugs this draft's tokens can be proposed under (``--brand-blue`` -> ``brand-blue``, the raw
    token slug the extractor keeps for a client's own token, and ``custom-brand-blue``, intake's): the
    only non-framework slugs the confirm step may drop."""
    rows = (intake.get("palette") or {}).get("rows") or []
    names = [r["token"].lstrip("-") for r in rows
             if isinstance(r, dict) and isinstance(r.get("token"), str) and r["token"].startswith("--")]
    return frozenset([*names, *(f"custom-{n}" for n in names)])


def _title(slug: str) -> str:
    return slug.replace("custom-", "").replace("-", " ").title()


def apply_confirmed(snap: dict, confirmed: dict[str, dict], framework: dict[str, str], trace: list,
                    draft_slugs: frozenset[str] = frozenset()) -> dict:
    """Make ``snap``'s palette follow ``confirmed`` (see the module docstring). Mutates and returns it."""
    color = snap.setdefault("settings", {}).setdefault("color", {})
    palette = color.get("palette") or []
    kept = []
    for entry in palette:
        slug = entry.get("slug") if isinstance(entry, dict) else None
        if slug and slug not in framework and slug not in confirmed:
            if slug in draft_slugs:
                trace.append({"kind": "confirm", "slug": slug, "action": "dropped",
                              "old": entry.get("color"),
                              "reason": "proposed from a draft token that no confirmed intake row names"})
                continue
            trace.append({"kind": "confirm", "slug": slug, "action": "kept",
                          "old": entry.get("color"),
                          "reason": "not a slug of this draft's tokens: a client slug the snapshot already held"})
        kept.append(entry)
    by_slug = {e.get("slug"): e for e in kept if isinstance(e, dict)}
    for slug, info in confirmed.items():
        entry = by_slug.get(slug)
        if entry is None:
            entry = {"slug": slug, "color": info["hex"], "name": framework.get(slug) or _title(slug)}
            kept.append(entry)
            by_slug[slug] = entry
            old = None
        else:
            old = entry.get("color")
        was_proposal = any(k in entry for k in _PROPOSAL_KEYS) or entry.get("_source") != "confirmed"
        if old is not None and _norm_hex(old) == info["hex"] and not was_proposal:
            continue  # already confirmed with this colour (second, post-merge pass)
        entry["color"] = info["hex"]
        for key in _PROPOSAL_KEYS:
            entry.pop(key, None)
        entry["_source"] = "confirmed"
        trace.append({"kind": "confirm", "slug": slug, "action": "added" if old is None else "set",
                      "old": old, "value": info["hex"], "tokens": ", ".join(info["tokens"]),
                      "reason": "Bean's confirmed palette role (intake review)"})
    color["palette"] = kept
    return snap
