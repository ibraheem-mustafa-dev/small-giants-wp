"""confirmed_palette.py — apply Bean's confirmed palette roles to the snapshot (Spec 48 FR-33-2).

The extractor proposes a slug for each draft token; intake shows those proposals to Bean, who marks
each ``palette-role`` row in ``intake.json``'s ``review[]``:

  ``accept``        take the row's proposed ``role`` (a ``None`` role means no palette entry)
  ``role:<slug>``   use that slug instead; ``role:<slug>,<slug>`` gives the token's colour to each slug
                    (a draft colour that fills several roles, such as heading and the text on accent)
  ``one-off``       no palette entry; the colour stays a literal hex where it is used

``confirmed_map`` turns those marks into ``{slug: {"hex", "tokens"}}``. ``apply_confirmed`` then sets
every confirmed slug to Bean's hex, adds a confirmed slug the palette lacks, and drops a
slug proposed from one of this draft's tokens that no confirmed row names (a token
Bean marked one-off). Any other slug, such as a client slug ``merge_onto`` carried from the existing
snapshot, is kept and logged, because the client's styles may reference it. Every change is logged
to the trace. The step is idempotent, so it can run once on the generated palette and again after
``merge_onto``.

A token's colour may carry alpha (``#rrggbbaa``, a translucent draft colour): its slug keeps that alpha in the
snapshot's palette. A confirmed colour keeps the case the draft's token writes it in (colours compare case-blind). A translucent colour fills a framework slug only when that slug's framework colour has the same
alpha; otherwise Bean marks it as a ``custom-<name>`` colour.

Two tokens whose colours are near-identical (CIEDE2000 ΔE ≤ 1 at the same alpha, the dedupe intake's proposal
applies, FR-33-2) are one colour: when both carry a slug, the slug keeps the hex of the token whose own colour is
the group's painted value (an intake row's ``value``: the member the draft paints most, so the one whose usage
earned the role); with no ``value`` (an older intake record), the token declared first (intake's palette rows follow
the token files).
Only genuinely different colours on one slug are refused.
"""
from __future__ import annotations

import json
import pathlib
import re

from colour import DEDUP_DELTA_E, delta_e

_CUSTOM_SLUG = re.compile(r"^custom-[a-z0-9]+(?:-[a-z0-9]+)*$")
# Keys that mark a palette entry as an unconfirmed proposal (FR-33-5); a confirmed entry sheds them.
_PROPOSAL_KEYS = ("advisory", "_baseline_color", "confidence")


class ConfirmError(ValueError):
    """The intake marks cannot be applied as they stand; the message names the row and the fix."""


def framework_slugs(baseline: dict) -> dict[str, str]:
    """``{slug: name}`` of the framework palette (``theme/sgs-theme/theme.json``)."""
    pal = ((baseline.get("settings") or {}).get("color") or {}).get("palette") or []
    return {e["slug"]: e.get("name") or e["slug"] for e in pal if isinstance(e, dict) and e.get("slug")}


def framework_colours(baseline: dict) -> dict[str, str]:
    """``{slug: colour}`` of the framework palette (``theme/sgs-theme/theme.json``)."""
    pal = ((baseline.get("settings") or {}).get("color") or {}).get("palette") or []
    return {e["slug"]: e["color"] for e in pal if isinstance(e, dict) and e.get("slug") and isinstance(e.get("color"), str)}


def _norm_hex(value) -> str | None:
    """``#rrggbb`` or ``#rrggbbaa`` lowercase (a fully opaque ``aa`` of ``ff`` is dropped); None if not a hex."""
    if not isinstance(value, str) or not re.fullmatch(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})", value.strip()):
        return None
    v = value.strip().lower()
    return v[:7] if v.endswith("ff") and len(v) == 9 else v


def _earned(row: dict, held_row: dict | None, declared_first: bool) -> bool:
    """Whether ``row``'s colour, rather than the held row's, is the colour a merged slug keeps: the row whose own hex
    is its group's painted ``value`` wins; else the token declared first."""
    own = lambda r: bool(r) and bool(r.get("value")) and _norm_hex(r.get("hex")) == _norm_hex(r.get("value"))  # noqa: E731
    if own(row) != own(held_row):
        return own(row)
    return declared_first


def _same_colour(a: str, b: str) -> bool:
    """Near-identical colours: the same alpha and CIEDE2000 ΔE ≤ 1 (FR-33-2's dedupe)."""
    return _alpha(a) == _alpha(b) and delta_e(a[:7], b[:7]) <= DEDUP_DELTA_E


def _written_hex(value) -> str | None:
    """The hex as the draft's token writes it (its case kept; a fully opaque ``ff`` alpha dropped); None if not a hex."""
    if _norm_hex(value) is None:
        return None
    v = value.strip()
    return v[:7] if len(v) == 9 and v[7:].lower() == "ff" else v


def _alpha(value) -> str:
    """The alpha byte of a hex colour (``ff`` when it has none or is not a hex)."""
    v = _norm_hex(value)
    return v[7:] if v and len(v) == 9 else "ff"


def _mark_slugs(token: str, mark, row: dict) -> list[str]:
    """The slugs one palette mark names: none for no mark (a mark is a correction, FR-32-28), ``one-off`` or an accepted "no palette entry" proposal; an accepted
    proposal names every slug of the row's ``roles`` (one value can fill several), else its ``role``."""
    if mark is None or mark == "one-off":
        return []
    if mark == "accept":
        if row.get("roles"):
            return list(row["roles"])
        return [row["role"]] if row.get("role") else []
    if isinstance(mark, str) and mark.startswith("role:"):
        return [part.strip() for part in mark[len("role:"):].split(",")]
    raise ConfirmError(f"{token}: unrecognised palette mark {mark!r} (accept, role:<slug>[,<slug>...] or one-off)")


def read_key(intake_path) -> dict[str, list[str]] | None:
    """Bean's answer key beside the intake (``palette-key.json``: ``{"roles": {token: [slug, ...]}}``), or None."""
    path = pathlib.Path(intake_path).with_name("palette-key.json")
    if not path.is_file():
        return None
    roles = json.loads(path.read_text(encoding="utf-8")).get("roles")
    return roles if isinstance(roles, dict) else None


def effective_marks(intake: dict, framework_slugs_: set[str] | frozenset[str] | dict, key: dict[str, list[str]] | None = None) -> dict:
    """The intake with every palette row marked (FR-32-28: the role map is a reading of the draft and a mark only corrects it).

    A row Bean's answer key names takes the key's framework slugs as ``role:<slugs>`` (``one-off`` when it names none: a
    key slug that is no framework role is the key's own name for a shade, which the palette already carries under the
    token's name). A row with no mark, or a ``None`` mark, is accepted as the reading proposed for it."""
    rows = [r.get("token") for r in ((intake.get("palette") or {}).get("rows") or []) if isinstance(r, dict) and r.get("token")]
    known = set(framework_slugs_)
    review = [e for e in intake.get("review") or []]
    held = {(e.get("rowId") or "")[len("palette:"):]: e for e in review
            if isinstance(e, dict) and e.get("rowType") == "palette-role" and (e.get("rowId") or "").startswith("palette:")}
    out = [e for e in review if not (isinstance(e, dict) and e.get("rowType") == "palette-role")]
    for token in rows:
        entry = dict(held.get(token) or {"rowType": "palette-role", "rowId": f"palette:{token}"})
        if key and token in key:
            slugs = [x for x in key[token] if x in known or _CUSTOM_SLUG.match(x)]
            entry["mark"] = ("role:" + ",".join(slugs)) if slugs else "one-off"
        elif entry.get("mark") is None:
            entry["mark"] = "accept"
        out.append(entry)
    return {**intake, "review": out}


def confirmed_map(intake: dict, known_slugs, colours: dict | None = None) -> tuple[dict[str, dict], list[str]]:
    """Return ``({slug: {"hex": "#rrggbb[aa]", "tokens": [...]}}, [unmarked tokens])`` from intake. ``colours`` is
    ``framework_colours(baseline)``: a translucent row fills a framework slug only when that slug's colour has the same
    alpha (a slug with no known colour counts as opaque).

    Raises ``ConfirmError`` for a mark on a token intake has no row for, an unrecognised mark, a
    slug that is neither a framework slug nor ``custom-<name>``, a row without a usable hex, a translucent colour on a
    framework slug whose colour has another alpha, or two
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
    order = {t: i for i, t in enumerate(rows)}
    confirmed: dict[str, dict] = {}
    for token, mark in marks.items():
        row = rows.get(token)
        if row is None:
            raise ConfirmError(f"review marks {token} but intake.palette.rows has no row for it; re-run intake")
        slugs = _mark_slugs(token, mark, row)
        if not slugs:
            continue
        hexv = _written_hex(row.get("hex"))
        if hexv is None:
            raise ConfirmError(f"{token}: intake row hex {row.get('hex')!r} is not a #rrggbb or #rrggbbaa colour")
        for slug in slugs:
            if slug not in known and not _CUSTOM_SLUG.match(slug):
                raise ConfirmError(f"{token}: confirmed slug {slug!r} is neither a framework palette slug "
                                   "(theme/sgs-theme/theme.json) nor a custom-<name> slug")
            if slug in known and _alpha(hexv) != _alpha((colours or {}).get(slug)):
                raise ConfirmError(f"{token}: {hexv} has alpha {_alpha(hexv)} but the framework slug {slug!r} has alpha "
                                   f"{_alpha((colours or {}).get(slug))}; a translucent colour fills a framework slug only at the "
                                   "same alpha, so mark it role:custom-<name>")
            held = confirmed.get(slug)
            if held and _norm_hex(held["hex"]) != _norm_hex(hexv) and _same_colour(held["hex"], hexv):
                if _earned(row, rows.get(held["tokens"][0]), order[token] < order[held["tokens"][0]]):
                    held["hex"] = hexv
                held.setdefault("merged", []).append(token)
                held["tokens"].append(token)
                continue
            if held and _norm_hex(held["hex"]) != _norm_hex(hexv):
                raise ConfirmError(f"slug {slug!r} is claimed by {', '.join(held['tokens'])} ({held['hex']}) "
                                   f"and by {token} ({hexv}); one slug cannot hold two colours")
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
                    draft_slugs: frozenset[str] = frozenset(), client_slugs: frozenset[str] = frozenset()) -> dict:
    """Make ``snap``'s palette follow ``confirmed`` (see the module docstring). Mutates and returns it."""
    color = snap.setdefault("settings", {}).setdefault("color", {})
    palette = color.get("palette") or []
    # A confirmed ``custom-<name>`` whose ``<name>`` the client's existing snapshot already holds (``client_slugs``:
    # the token's own name, which earlier builds use and the framework's styles read as
    # ``--wp--preset--color--<name>``) keeps that client slug, so it is never duplicated under a second name.
    for slug in [s for s in confirmed if s.startswith("custom-")]:
        name = slug[len("custom-"):]
        if name in client_slugs and name not in framework and name not in confirmed:
            confirmed = {**{k: v for k, v in confirmed.items() if k != slug}, name: confirmed[slug]}
            trace.append({"kind": "confirm", "slug": name, "action": "named",
                          "reason": f"{slug} is the client slug {name} the palette already holds"})
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
        if old is not None and old == info["hex"] and not was_proposal:
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
