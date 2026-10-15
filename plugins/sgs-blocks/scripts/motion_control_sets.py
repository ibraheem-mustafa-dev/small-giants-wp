"""motion_control_sets.py - the rules behind check-motion-control-sets.py (Spec 38A FR-38A-10, 11 and 46).

A WORLD is a plain dict: {"table": [rows], "fx_effects": [slug], "presets": [rows], "db_presets": [rows], "schema": {...},
"aliases": {...}}. `find_gaps(world)` returns {key: message}; a key is "<rule>:<effect>[:<detail>]" and is what the
allow-list matches (fnmatch). Rules:
  a-table    a fx_effects slug, a motion_presets effect or a preset family has no section 5.4 row (an effect named in
             backticks inside another row's Effect cell counts as documented there); a backticked 5.4 row has no fx_effects row
  a-schema   a fx_effects slug has no x-sgs-effects entry (rows whose 5.4 Panel is "Site settings page" or "Block-owned" are exempt)
  b-count    a non-hidden 5.4 row lacks exactly one Subtle, Standard and Bold Intensity row; a hidden row has any
  b-values   the three numbers a 5.4 Intensity cell lists are not the numbers its Subtle / Standard / Bold rows store
  b-fields   an Intensity row stores a field its effect's Values definition does not declare
  c-token    in one preset family a field points at a token in some row and is a literal in another, or names an unknown token
  d-sibling  Intensity rows of one family differ in trigger, target or panel
  e-dramatic a label (preset, DB row or schema string) reads "Dramatic"
  f-target   a preset or DB row's target differs from the 5.4 Target cell, or the schema declares a different x-target-level;
             `f-schema` lists effects whose schema entry declares no x-target-level
"""
from __future__ import annotations

import fnmatch
import re
from typing import Any, Iterator

HEADER = re.compile(r"^\|\s*Effect\s*\|\s*Panel\s*\|\s*Tier\s*\|\s*Target\s*\|\s*Intensity", re.I)
TICKS = re.compile(r"`([a-z0-9-]+)`")
NUM = r"(\d+(?:\.\d+)?)\s*(?:em|px|s|%|x|deg)?"
TRIPLE = re.compile(NUM + r"\s*/\s*" + NUM + r"\s*/\s*" + NUM)
LEVELS = ("subtle", "standard", "bold")
SCHEMA_EXEMPT_PANELS = ("site settings", "block-owned")
STRUCTURAL = {"rows", "from", "to"}


def parse_table(text: str, aliases: dict[str, list[str]]) -> list[dict]:
    """Rows of the section 5.4 table, anchored on its header row `| Effect | Panel | Tier | Target | Intensity ...`."""
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines) if HEADER.match(line)), None)
    if start is None:
        raise ValueError("section 5.4 table header row (| Effect | Panel | Tier | Target | Intensity ...) not found")
    rows: list[dict] = []
    for line in lines[start + 2:]:
        if not line.startswith("|"):
            break
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) != 5:
            raise ValueError(f"section 5.4 row has {len(cells)} cells, expected 5: {line[:80]}")
        effect, panel, tier, target, intensity = cells
        ticks = TICKS.findall(effect)
        lead = effect.lower()
        keys = [ticks[0]] if effect.startswith("`") and ticks else next(
            (fams for prefix, fams in aliases.items() if lead.startswith(prefix)), [])
        rows.append({"effect": effect, "keys": keys, "covered": set(ticks) | set(keys), "backticked": effect.startswith("`"),
                     "panel": panel, "targets": set(re.findall(r"block|surface|part|site|paired", target.lower())),
                     "hidden": intensity.lower().startswith("hidden"), "intensity": intensity,
                     "triples": [tuple(float(n) for n in m.groups()) for m in TRIPLE.finditer(intensity)]})
    return rows


def _walk(value: Any, path: str = "") -> Iterator[tuple[str, Any]]:
    if isinstance(value, dict):
        for key, inner in value.items():
            yield from _walk(inner, f"{path}.{key}" if path else key)
    elif isinstance(value, list):
        for index, inner in enumerate(value):
            yield from _walk(inner, f"{path}[{index}]")
    else:
        yield path, value


def _token(value: Any) -> str | None:
    match = re.fullmatch(r"-?token:([a-z0-9.-]+)", value) if isinstance(value, str) else None
    return match.group(1) if match else None


def _numbers(values: dict, bands: dict) -> list[tuple[float, float]]:
    """Every number a values dict stores as (low, high) - a literal is its own band, a token its band (absolute)."""
    out: list[tuple[float, float]] = []
    for _, leaf in _walk(values):
        token = _token(leaf)
        band = (bands.get(token) or {}).get("band") if token else None
        if band:
            out.append((float(band["min"]), float(band["max"])))
        elif isinstance(leaf, (int, float)) and not isinstance(leaf, bool):
            out.append((abs(float(leaf)),) * 2)
        elif isinstance(leaf, str) and (m := re.match(r"-?(\d+(?:\.\d+)?)", leaf)):
            out.append((float(m.group(1)),) * 2)
    return out


def _holds(number: float, bands: list[tuple[float, float]]) -> bool:
    return any(lo <= n <= hi for lo, hi in bands for n in (number, number * 1000))


def _group(row: dict) -> str:
    return row.get("effect") or row.get("family") or row["slug"]


def _intensity_groups(presets: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {}
    for row in presets:
        if row.get("kind") == "intensity":
            groups.setdefault(row.get("family") or _group(row), []).append(row)
    return groups


def _values_def(schema: dict, effect: str) -> dict | None:
    entry = (schema.get("x-sgs-effects") or {}).get(effect)
    ref = (entry or {}).get("values", "")
    return (schema.get("$defs") or {}).get(ref.rsplit("/", 1)[-1])


def _gaps_table_and_schema(world: dict, rows: list[dict], gaps: dict[str, str]) -> None:
    schema_effects = (world["schema"].get("x-sgs-effects") or {})
    covered = set().union(*[r["covered"] for r in rows]) if rows else set()
    exempt = {k for r in rows for k in r["keys"] if r["panel"].lower().startswith(SCHEMA_EXEMPT_PANELS)}
    for slug in world["fx_effects"]:
        if slug not in covered:
            gaps[f"a-table:{slug}"] = f"effect={slug} rule=a-table: fx_effects row has no section 5.4 row"
        if slug not in schema_effects and slug not in exempt:
            gaps[f"a-schema:{slug}"] = f"effect={slug} rule=a-schema: fx_effects row has no x-sgs-effects entry in the schema"
    for row in rows:
        for key in row["keys"] if row["backticked"] else []:
            if key not in world["fx_effects"]:
                gaps[f"a-table:{key}:db"] = f"effect={key} rule=a-table: section 5.4 row has no fx_effects row"
    known = {k for r in rows for k in r["keys"]}
    for group, members in _intensity_groups(world["presets"]).items():
        names = {group} | {m.get("effect") for m in members if m.get("effect")}
        if not names & (known | covered):
            gaps[f"a-table:{group}"] = f"effect={group} rule=a-table: motion_presets family has no section 5.4 row (slugs {[m['slug'] for m in members]})"


def _gaps_intensity(world: dict, rows: list[dict], gaps: dict[str, str]) -> None:
    bands = world["schema"].get("x-sgs-tokens") or {}
    groups = _intensity_groups(world["presets"])
    for row in rows:
        for key in row["keys"]:
            members = groups.get(key, [])
            levels = sorted(m.get("intensity") for m in members)
            if row["hidden"] and members:
                gaps[f"b-count:{key}"] = f"effect={key} rule=b-count: hidden in 5.4 but has Intensity rows {levels}"
            elif not row["hidden"] and levels != sorted(LEVELS):
                gaps[f"b-count:{key}"] = f"effect={key} rule=b-count: needs exactly {list(LEVELS)}, has {levels}"
        by_key = {k: {m["intensity"]: m for m in groups.get(k, [])} for k in row["keys"]}
        for triple in row["triples"] if not row["hidden"] else []:
            fits = [k for k, lv in by_key.items() if all(l in lv and _holds(n, _numbers(lv[l]["values"], bands))
                                                         for l, n in zip(LEVELS, triple))]
            if by_key and not fits and all(len(lv) == 3 for lv in by_key.values()):
                shown = {k: [_numbers(lv[l]["values"], bands) for l in LEVELS] for k, lv in by_key.items()}
                key = next(iter(by_key))
                gaps[f"b-values:{key}"] = f"effect={key} rule=b-values: 5.4 lists {triple}, rows store {shown[key]}"
    for group, members in groups.items():
        effect = members[0].get("effect")
        declared = ((_values_def(world["schema"], effect) or {}).get("properties") or {}) if effect else None
        for member in members:
            for field in (member["values"] if declared is not None else {}):
                if field not in declared and field not in STRUCTURAL:
                    gaps[f"b-fields:{effect}:{field}"] = (f"effect={effect} rule=b-fields: row {member['slug']} stores {field!r}, "
                                                          f"which the Values definition does not declare")


def _gaps_tokens(world: dict, gaps: dict[str, str]) -> None:
    bands = world["schema"].get("x-sgs-tokens") or {}
    families: dict[str, list[dict]] = {}
    for row in world["presets"]:
        if row.get("kind") != "keyframe":
            families.setdefault(row.get("family") or _group(row), []).append(row)
    for family, members in families.items():
        by_path: dict[str, dict[str, Any]] = {}
        for member in members:
            for path, leaf in _walk(member["values"]):
                by_path.setdefault(path, {})[member["slug"]] = leaf
        for path, seen in by_path.items():
            tokens = {slug: _token(v) for slug, v in seen.items()}
            for slug, token in tokens.items():
                if token and bands and token not in bands:
                    gaps[f"c-token:{family}:{path}:unknown"] = f"effect={family} rule=c-token: {slug} {path}={seen[slug]!r} names no schema token"
            if any(tokens.values()):
                for slug, token in tokens.items():
                    if not token and isinstance(seen[slug], (int, float, str)) and not isinstance(seen[slug], bool) and not _is_word(seen[slug]):
                        gaps[f"c-token:{family}:{path}"] = (f"effect={family} rule=c-token: {slug} {path}={seen[slug]!r} is a literal "
                                                            f"where its siblings point at tokens {sorted({t for t in tokens.values() if t})}")


def _is_word(value: Any) -> bool:
    return isinstance(value, str) and not re.match(r"-?\d", value)


def _gaps_siblings_labels_targets(world: dict, rows: list[dict], gaps: dict[str, str]) -> None:
    table = {k: r for r in rows for k in r["keys"]}
    for source, presets in (("json", world["presets"]), ("db", world.get("db_presets") or [])):
        for group, members in _intensity_groups(presets).items():
            for attr in ("trigger", "target", "panel"):
                if len({m.get(attr) for m in members}) > 1:
                    gaps[f"d-sibling:{group}:{attr}:{source}"] = (
                        f"effect={group} rule=d-sibling: {source} Intensity rows differ in {attr}: "
                        f"{ {m['slug']: m.get(attr) for m in members} }")
            row = table.get(group) or next((table[m["effect"]] for m in members if m.get("effect") in table), None)
            if row and row["targets"]:
                bad = {m["slug"]: m.get("target") for m in members if m.get("target") not in row["targets"]}
                if bad:
                    gaps[f"f-target:{group}:{source}"] = (f"effect={group} rule=f-target: {source} {bad} but 5.4 says {sorted(row['targets'])}")
        for row in presets:
            if "dramatic" in str(row.get("label", "")).lower():
                gaps[f"e-dramatic:{row['slug']}:{source}"] = f"effect={_group(row)} rule=e-dramatic: {source} label {row['label']!r}"
    for path, leaf in _walk(world["schema"]):
        if isinstance(leaf, str) and "dramatic" in leaf.lower():
            gaps[f"e-dramatic:schema:{path[:60]}"] = f"rule=e-dramatic: schema {path} reads {leaf[:60]!r}"
    missing = []
    for slug, entry in (world["schema"].get("x-sgs-effects") or {}).items():
        declared = entry.get("x-target-level") or (_values_def(world["schema"], slug) or {}).get("x-target-level")
        row = table.get(slug)
        if not declared:
            missing.append(slug)
        elif row and row["targets"] and declared not in row["targets"]:
            gaps[f"f-target:{slug}:schema"] = f"effect={slug} rule=f-target: schema x-target-level {declared!r} but 5.4 says {sorted(row['targets'])}"
    if missing:
        gaps["f-schema"] = f"rule=f-target: no x-target-level in the schema for {len(missing)} effects: {', '.join(sorted(missing))}"


def find_gaps(world: dict) -> dict[str, str]:
    rows = world["table"]
    gaps: dict[str, str] = {}
    _gaps_table_and_schema(world, rows, gaps)
    _gaps_intensity(world, rows, gaps)
    _gaps_tokens(world, gaps)
    _gaps_siblings_labels_targets(world, rows, gaps)
    return gaps


def split_allowed(gaps: dict[str, str], patterns: set[str]) -> tuple[dict[str, str], dict[str, str], list[str]]:
    """(failures, allowed, unused patterns): a pattern is an fnmatch over the gap key."""
    allowed = {k: m for k, m in gaps.items() if any(fnmatch.fnmatchcase(k, p) for p in patterns)}
    unused = sorted(p for p in patterns if not any(fnmatch.fnmatchcase(k, p) for k in gaps))
    return {k: m for k, m in gaps.items() if k not in allowed}, allowed, unused
