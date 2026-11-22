"""shade_palette.py: a cloned client's palette is its draft's own shades; the framework roles are hidden pointers (Spec 32 FR-32-28).

Two layers with two jobs, written from the export's ``tokens/colors.css``:

  * ``settings.color.palette``: one entry per literal colour token (alpha included), slug the token's exact name,
    display name in plain English without the namespace word most tokens share (``--mm-cocoa`` -> "Cocoa"). A token whose
    value is ``var(--...)`` (an alias) is no entry. A gradient token is a ``settings.color.gradients`` preset. A token named
    for a registry brand (a social network, WhatsApp, a payment button: ``palette_vocab.brand_words``) is neither: its
    block holds that colour. The generic framework entries are not in the palette. A shade whose slug is also a role slug
    the role does not point at is suffixed ``-shade``, because the role's ``:root`` declaration would repaint it.
  * ``settings.custom.colourRoles``: ``{role: shade slug}`` for every framework role of ``theme/sgs-theme/theme.json``
    that the palette does not already answer under its own name. The theme prints each as
    ``--wp--preset--color--<role>: var(--wp--preset--color--<shade>)``. Sources, weakest first: the extractor's usage
    proposals (``_source`` palette entries), the draft's own alias tokens (``--text-body: var(--ink)``, named by the role
    vocabulary ``scripts/computed-route/data/palette-role-words.json``) and Bean's confirmed intake marks, which win; a role
    none of them names takes the draft's own literal token named for it (``--acc-ink`` for ``accent-text``,
    ``role_of_name``), and one still unnamed follows its related role (``palette_vocab.ROLE_DEFAULT_TABLE``), and a status role takes a token of
    its own name. A role nothing names is read from what the draft paints in its job
    (``role_readings.py``: the control-border colour for ``border``, the primary button's hover fill for ``primary-dark``,
    and so on) and points at that colour's shade, or holds the draft's raw hex when the colour has no token; a role the
    draft never shows takes the value of the role it renders as. A status role with no shade keeps the framework value as
    raw hex. The role map is a reading of the draft: no role is ever a review row and no framework default is written
    for a brand role.

``apply`` also rewrites every reference to a palette slug that no longer exists to the shade of the same colour.
Nothing here names a client.
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import sqlite3

from colour import delta_e, parse_colour
import role_readings
from palette_vocab import (DISPLAY_WORDS, ROLE_DEFAULT_TABLE, STATUS_ROLE_RE, brand_words, trace_row)

_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_GRADIENT = re.compile(r"^(?:repeating-)?(?:linear|radial|conic)-gradient\(", re.I)
_COMMENT = re.compile(r"/\*.*?\*/", re.S)
_RAW_ALIAS = re.compile(r"--([\w-]+)\s*:\s*var\(\s*--([\w-]+)", re.I)
_ROLE_WORDS = pathlib.Path(__file__).resolve().parents[4] / "scripts" / "computed-route" / "data" / "palette-role-words.json"
SHADE_SUFFIX = "-shade"
SHADE_DELTA_E = 1.0
# How a role is named by the draft: its exact slug (strength 3) or a role-vocabulary alias name (strength 2).
EXACT, VOCAB = 3, 2


def _words(name: str) -> list[str]:
    return [w for w in re.split(r"[-_]+", name.lower().lstrip("-")) if w]


def namespace_of(names: list[str]) -> str | None:
    """The first word most names share (``mm`` in ``mm-cocoa``), or None: kept off display names and alias names."""
    firsts: dict[str, int] = {}
    for n in names:
        w = _words(n)
        if w:
            firsts[w[0]] = firsts.get(w[0], 0) + 1
    if not firsts or len(names) < 3:
        return None
    word, count = max(firsts.items(), key=lambda kv: (kv[1], kv[0]))
    return word if count >= 0.8 * len(names) else None


def display_name(token: str, ns: str | None) -> str:
    """Plain English display name: the namespace word removed, abbreviations expanded, words title-cased."""
    words = _words(token)
    if ns and len(words) > 1 and words[0] == ns:
        words = words[1:]
    return " ".join(DISPLAY_WORDS.get(w, w).title() if not w.isdigit() else w for w in words)


def _hex(colour) -> str:
    """``#RRGGBB`` or ``#RRGGBBAA`` upper-case from a parsed colour."""
    base = colour.hex.upper()
    if colour.alpha >= 0.999:
        return base
    return base + format(int(colour.alpha * 255 + 0.5), "02X")


def _raw_aliases(draft_dir) -> dict[str, str]:
    """``{alias token: the token its first ``var()`` names}`` across the export's token files (names without ``--``)."""
    out: dict[str, str] = {}
    folder = pathlib.Path(draft_dir) / "tokens"
    for path in sorted(folder.glob("*.css")) if folder.is_dir() else []:
        for name, target in _RAW_ALIAS.findall(_COMMENT.sub("", path.read_text(encoding="utf-8", errors="replace"))):
            out.setdefault(name.lower(), target.lower())
    return out


def read_shades(tokens: dict, trace: list) -> dict:
    """Classify the token files' tokens: ``{"shades": [...], "gradients": [...], "aliases": {name: target}, "ns"}``.

    ``tokens`` is ``token_files.read_token_files`` output. A shade is ``{"token", "color", "name"}``; a registry brand's
    token is skipped with a trace row."""
    # The shared namespace word is read off the colour tokens alone (a spacing or font token must not decide it).
    names = [n for n, v in tokens["tokens"].items() if _GRADIENT.match(v.strip()) or parse_colour(v) is not None]
    ns = namespace_of(names)
    brands = brand_words()
    shades, gradients = [], []
    alias_names = tokens.get("aliases") or set()
    for name, value in tokens["tokens"].items():
        if name in alias_names:
            continue
        gradient = bool(_GRADIENT.match(value.strip()))
        colour = None if gradient else parse_colour(value)
        if not gradient and colour is None:
            continue
        if brands.intersection(_words(name)):
            trace_row(trace, "gap", f"tokens/*.css --{name}", "named for a registry brand: its block holds this colour, so it is no palette entry", value)
        elif not _SLUG.match(name):
            trace_row(trace, "gap", f"tokens/*.css --{name}", "the token name is not a valid slug", value)
        elif gradient:
            gradients.append({"slug": name, "name": display_name(name, ns), "gradient": value.strip()})
        else:
            shades.append({"token": name, "color": _hex(colour), "name": display_name(name, ns)})
    return {"shades": shades, "gradients": gradients, "ns": ns}


def _shade_for_hex(shades: list[dict], value: str) -> str | None:
    """The shade whose colour is ``value`` (exact, else CIEDE2000 within 1 at the same alpha), first in file order."""
    if not isinstance(value, str):
        return None
    parsed = parse_colour(value)
    if parsed is None:
        return None
    want = _hex(parsed)
    for s in shades:
        if s["color"] == want:
            return s["token"]
    for s in shades:
        other = parse_colour(s["color"])
        if other is not None and abs(other.alpha - parsed.alpha) < 0.01 and delta_e(other.hex, parsed.hex) <= SHADE_DELTA_E:
            return s["token"]
    return None


def role_of_name(key: str, roles: list[str], words: dict) -> tuple[str | None, int]:
    """``(role, strength)`` a token name states, or ``(None, 0)``: the exact slug (``EXACT``), a vocabulary alias name, or a
    slug its words compose (``VOCAB``): the abbreviations expanded (``acc`` is ``accent``), then the last word read as a
    variant of the base (``acc-ink`` is ``accent-text``, ``acc-soft`` is ``accent-light``, ``text-2`` is ``text-muted``) or the
    whole expanded name as a slug (``acc`` is ``accent``). ``words`` is the role vocabulary file's content."""
    if key in roles:
        return key, EXACT
    alias = (words.get("aliasNames") or {}).get(key)
    if alias in roles:
        return alias, VOCAB
    parts = words.get("nameParts") or {}
    expanded = [(parts.get("abbreviations") or {}).get(w, w) for w in key.split("-")]
    if "-".join(expanded) in roles:
        return "-".join(expanded), VOCAB
    if len(expanded) > 1:
        for variant, synonyms in (parts.get("variants") or {}).items():
            candidate = "-".join(expanded[:-1] + [variant])
            if expanded[-1] in synonyms and candidate in roles:
                return candidate, VOCAB
    return None, 0


def alias_roles(raw: dict[str, str], shades: list[dict], ns: str | None, roles: list[str]) -> dict[str, tuple[str, str, int]]:
    """``{role: (shade token, alias token, strength)}`` from the draft's alias tokens (or, given ``{shade: shade}``, from its
    literal colour tokens, so a token named for its role answers that role).

    An alias names a role by its exact slug (``--text-body`` is not a slug; ``--surface`` would be), by the
    vocabulary's alias names or by the slug its words compose (``role_of_name``), with the shared namespace word removed. The
    alias resolves through any chain of aliases to a shade. For one role the stronger name wins; two of one strength naming
    different shades cancel."""
    vocab = json.loads(_ROLE_WORDS.read_text(encoding="utf-8"))
    shade_slugs = {s["token"] for s in shades}
    found: dict[str, list[tuple[int, str, str]]] = {}
    for alias, target in raw.items():
        words = _words(alias)
        if ns and len(words) > 1 and words[0] == ns:
            words = words[1:]
        key = "-".join(words)
        role, strength = role_of_name(key, roles, vocab)
        if role is None:
            continue
        hops = 0
        while target in raw and raw[target] != target and hops < 8:
            target, hops = raw[target], hops + 1
        if target in shade_slugs:
            found.setdefault(role, []).append((strength, target, alias))
    out: dict[str, tuple[str, str, int]] = {}
    for role, rows in found.items():
        top = max(r[0] for r in rows)
        winners = {r[1] for r in rows if r[0] == top}
        if len(winners) == 1:
            first = next(r for r in rows if r[0] == top)
            out[role] = (first[1], first[2], top)
    return out


def _colour_of(value: str, shades: list[dict]) -> str | None:
    """The colour a role value stands for: a raw hex as is, or the colour of the shade it names."""
    if value.startswith("#"):
        return value.upper()
    return next((s["color"] for s in shades if s["token"] == value), None)


def build_role_map(*, shades: list[dict], raw_aliases: dict[str, str], ns: str | None, palette_before: list[dict],
                   confirmed: dict | None, roles: list[str], framework_hex: dict[str, str], usage: list[dict],
                   button_presets: dict, trace: list) -> tuple[dict[str, str], list[str]]:
    """``({role: shade slug | raw hex}, [roles nothing could give a value])`` (see the module docstring for the sources).

    The second list is empty whenever the draft yields a reading or a related role; it exists so a failure is loud."""
    resolved: dict[str, tuple[str, str]] = {}
    own = {s["token"] for s in shades}
    for role in roles:
        if role in own and STATUS_ROLE_RE.match(role):
            resolved[role] = (role, "the draft's own token of this status name")
    fallbacks: list[tuple[str, str, str]] = []
    for entry in palette_before:
        slug = entry.get("slug") if isinstance(entry, dict) else None
        if slug in roles and entry.get("_source") and isinstance(entry.get("color"), str):
            shade = _shade_for_hex(shades, entry["color"])
            if shade and "derived" == entry["_source"]:
                # A derived entry is a role default (no draft colour, so it follows another role): it settles a role only
                # when nothing the draft says does, its own token named for the role included.
                fallbacks.append((slug, shade, f"usage proposal {entry['color']} ({entry['_source']})"))
            elif shade:
                resolved[slug] = (shade, f"usage proposal {entry['color']} ({entry['_source']})")
    for role, (shade, alias, strength) in alias_roles(raw_aliases, shades, ns, roles).items():
        resolved[role] = (shade, f"draft alias --{alias}")
    for role, info in (confirmed or {}).items():
        if role not in roles:
            continue
        by_token = next((t.lstrip("-").lower() for t in info.get("tokens", []) if t.lstrip("-").lower() in own), None)
        shade = by_token or _shade_for_hex(shades, info.get("hex"))
        if shade:
            resolved[role] = (shade, f"Bean's confirmed mark ({', '.join(info.get('tokens', []))})")
    # A role nothing above settled takes the draft's own literal token named for it (``--acc`` for accent, ``--acc-ink`` for
    # accent-text), before any derived role default, reading or follow rule: a usage proposal, an alias or a mark still outranks a name.
    for role, (shade, token, _strength) in alias_roles({s["token"]: s["token"] for s in shades}, shades, ns, roles).items():
        if role not in resolved:
            resolved[role] = (shade, f"the draft's own token --{token} is named for this role")
    for role, shade, why in fallbacks:
        resolved.setdefault(role, (shade, why))

    def hex_of(role: str) -> str | None:
        return _colour_of(resolved[role][0], shades) if role in resolved else None

    def preset_colour(ref: str) -> str | None:
        m = re.match(r"^(?:var\(--wp--preset--color--([a-z0-9-]+)\)|var:preset\|color\|([a-z0-9-]+))$", ref.strip())
        if m:
            return hex_of(m.group(1) or m.group(2))
        return ref.strip().upper() if re.match(r"^#[0-9A-Fa-f]{6}$", ref.strip()) else None

    def settle(role: str, reading: tuple[str, str] | None) -> None:
        if reading is None or role in resolved:
            return
        value, why = reading
        # Exact colour only: a reading is the colour the draft paints, so a near-identical shade is not a stand-in for it.
        exact = next((sh['token'] for sh in shades if sh['color'] == value.upper()), None)
        resolved[role] = (exact or value.upper(), why)

    settle("border", role_readings.read_border(usage))
    settle("primary-dark", role_readings.read_primary_dark(button_presets, preset_colour))
    taken = {c for c in (hex_of(r) for r in ("primary", "accent", "section")) if c}
    settle("border-light", role_readings.read_border_light(usage, hex_of("border"), taken))
    settle("accent-light", role_readings.read_accent_light(usage, hex_of("accent")))
    for role, follows in ROLE_DEFAULT_TABLE:
        if role not in resolved and follows in resolved:
            resolved[role] = (resolved[follows][0], f"follows {follows}")
    changed = True
    while changed:
        changed = False
        for role in roles:
            follows = role_readings.FOLLOW_WHEN_ABSENT.get(role)
            if role not in resolved and follows in resolved and not STATUS_ROLE_RE.match(role):
                resolved[role] = (resolved[follows][0], f"the draft never shows it: it renders as {follows}")
                changed = True
    out: dict[str, str] = {}
    unresolved: list[str] = []
    for role in roles:
        if role in resolved:
            out[role] = resolved[role][0]
            trace_row(trace, "role", f"colourRoles.{role}", resolved[role][1], resolved[role][0])
        elif STATUS_ROLE_RE.match(role):
            out[role] = framework_hex[role]
            trace_row(trace, "role", f"colourRoles.{role}", "status role the draft has no shade for: the framework value", framework_hex[role])
        else:
            unresolved.append(role)
            trace_row(trace, "gap", f"colourRoles.{role}", "no alias, mark, reading or related role gives this role a value")
    return out, unresolved


def _rewrite_refs(node, renames: dict[str, str]):
    """Return ``node`` with every ``--wp--preset--color--<old>`` and ``var:preset|color|<old>`` renamed (in place for containers)."""
    if isinstance(node, dict):
        for k, v in node.items():
            node[k] = _rewrite_refs(v, renames)
        return node
    if isinstance(node, list):
        return [_rewrite_refs(v, renames) for v in node]
    if isinstance(node, str) and ("--wp--preset--color--" in node or "var:preset|color|" in node):
        def swap(m):
            return m.group(1) + renames.get(m.group(2), m.group(2))
        return re.sub(r"(--wp--preset--color--|var:preset\|color\|)([a-z0-9-]+)", swap, node)
    return node


def apply(snap: dict, tokens: dict, draft_dir, baseline: dict, confirmed: dict | None, trace: list) -> list[str]:
    """Replace the snapshot's palette with the draft's shades and write ``settings.custom.colourRoles``.

    Returns the roles nothing gave a value (empty for any draft that paints its roles). A draft with no colour token
    leaves ``snap`` untouched."""
    parsed = read_shades(tokens, trace)
    shades, gradients, ns = parsed["shades"], parsed["gradients"], parsed["ns"]
    if not shades:
        return []
    framework = [e for e in (((baseline.get("settings") or {}).get("color") or {}).get("palette") or []) if isinstance(e, dict)]
    roles = [e["slug"] for e in framework]
    framework_hex = {e["slug"]: e["color"] for e in framework}
    color = snap.setdefault("settings", {}).setdefault("color", {})
    before = [e for e in (color.get("palette") or []) if isinstance(e, dict)]
    by_hex_old = {e["slug"]: e.get("color") for e in before if e.get("slug")}
    role_map, unresolved = build_role_map(shades=shades, raw_aliases=_raw_aliases(draft_dir), ns=ns, palette_before=before,
                                      confirmed=confirmed, roles=roles, framework_hex=framework_hex,
                                      usage=role_readings.load_usage(draft_dir),
                                      button_presets=(snap.get("settings", {}).get("custom") or {}).get("buttonPresets") or {}, trace=trace)
    shade_slug = {s["token"]: s["token"] for s in shades}
    for s in shades:
        if s["token"] in roles and role_map.get(s["token"]) not in (None, s["token"]):
            shade_slug[s["token"]] = s["token"] + SHADE_SUFFIX
            trace_row(trace, "gap", f"palette.{s['token']}", f"the draft's token shares a role slug that points at another shade: the shade is "
                      f"{shade_slug[s['token']]}", s["color"])
    role_map = {r: shade_slug.get(v, v) for r, v in role_map.items() if shade_slug.get(v, v) != r}
    color["palette"] = [{"slug": shade_slug[s["token"]], "color": s["color"], "name": s["name"], "_source": "declared"} for s in shades]
    color["gradients"] = gradients
    snap["settings"].setdefault("custom", {})["colourRoles"] = role_map
    renames: dict[str, str] = {}
    live = {e["slug"] for e in color["palette"]} | set(role_map)
    for old, old_hex in by_hex_old.items():
        if old in live or old in roles:
            continue
        target = _shade_for_hex([{"token": shade_slug[s["token"]], "color": s["color"]} for s in shades], old_hex)
        if target:
            renames[old] = target
    styles_and_rest = {k: v for k, v in snap.items() if k != "settings"}
    for k, v in styles_and_rest.items():
        snap[k] = _rewrite_refs(v, renames)
    for k, v in snap["settings"].items():
        if k not in ("color", "custom"):
            snap["settings"][k] = _rewrite_refs(v, renames)
    custom = snap["settings"]["custom"]
    for k, v in custom.items():
        if k != "colourRoles":
            custom[k] = _rewrite_refs(v, renames)
    return unresolved
