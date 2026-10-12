"""motion_spec_pins -- the motion schema's spec-stated values, compared with Spec 38A itself.

``spec_pin_errors(schema, spec_text)`` returns ``(errors, notes)`` for ``check-motion-schema.py``. Each error starts
with its rule name so the checker's self-test can tell which rule caught a plant:

* ``spec-refusals``  every refusal, limit and notice text appears word for word in the spec, unless its entry sets
                     ``textSource: schema`` (listed as a note)
* ``spec-bands``     every §7 token band equals the band its §7 table row states
* ``spec-channels``  every §10 channel's owner custom properties equal the names its table row lists, each composed
                     channel's owner properties start at the identity value (0px, 0deg, or 1 for a product; 0 for
                     grayscale and 1 for brightness inside the filter list), and every syntax is one §10 names
* ``spec-limits``    the injected-layer cap equals the §10 row's "at most N"
* ``spec-triggers``  each layer's trigger enum equals the §6.2 shape's trigger list for that layer
"""
from __future__ import annotations

import re

NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4}
# The §6.2 shape lists triggers in this order: hover state, hover effects, entrance base, entrance text, effects.
TRIGGER_LAYERS = ["HoverState", "HoverEffect", "EntranceBase", "EntranceTextEffect", "EffectLayer"]


def section(text: str, heading: str) -> str:
    """The body under one heading (a regex for the heading line), up to the next heading of the same or higher level."""
    m = re.search(rf"^(#+) {heading}\n", text, re.M)
    if not m:
        return ""
    level = len(m.group(1))
    rest = text[m.end():]
    end = re.search(rf"^#{{1,{level}}} ", rest, re.M)
    return rest[: end.start()] if end else rest


def table_rows(body: str) -> list[list[str]]:
    return [[c.strip() for c in line.split("|")[1:-1]] for line in body.splitlines() if line.startswith("| ") and not line.startswith("|---")]


def spec_tokens(text: str) -> dict[str, str]:
    """Each §7 token name mapped to its row's band cell (`a.b`, with `.c` shorthand taking the previous family)."""
    out: dict[str, str] = {}
    for cells in table_rows(section(text, r"7\. Tokens")):
        if len(cells) < 3 or not cells[0].startswith("`"):
            continue
        family = None
        for tok in re.findall(r"`([a-z-]*\.[a-z-]+)`", cells[0]):
            if tok.startswith("."):
                tok = f"{family}{tok}"
            family = tok.split(".")[0]
            out[tok] = cells[2]
    return out


def _expected_band(token: str, cell: str, bands: dict[str, str]) -> dict | None:
    m = re.search(r"(\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)(ms|px)", cell)
    if m and "linear()" not in cell:
        kind = "time" if m.group(3) == "ms" else "length"
        return {"kind": kind, "unit": m.group(3), "min": float(m.group(1)), "max": float(m.group(2))}
    if "same band as" in cell:
        ref = re.search(r"same band as `([a-z.-]+)`", cell)
        return _expected_band(ref.group(1), bands[ref.group(1)], bands) if ref else None
    m = re.search(r"x1 at most ([\d.]+), y1 at least ([\d.]+), y2 equal to ([\d.]+)", cell)
    if m:
        return {"kind": "cubic-bezier", "x1Max": float(m.group(1)), "y1Min": float(m.group(2)), "y2Equals": float(m.group(3))}
    if "linear()" in cell:
        if token.endswith("gentle"):
            m = re.search(r"at most ([\d.]+) \(gentle\)", cell)
            return {"kind": "linear-overshoot", "peakMax": float(m.group(1))} if m else None
        m = re.search(r"([\d.]+) to ([\d.]+) \(bouncy\)", cell)
        return {"kind": "linear-overshoot", "peakMin": float(m.group(1)), "peakMax": float(m.group(2))} if m else None
    m = re.search(r"equals its `(\w+)` key with `([a-z.-]+)`", cell)
    if m:
        return {"kind": "transition-pair", "duration": f"{m.group(1)}.{token.split('.')[1]}", "easing": m.group(2)}
    return None


def _same(a: dict, b: dict) -> bool:
    if set(a) != set(b):
        return False
    return all(abs(a[k] - b[k]) < 1e-9 if isinstance(a[k], (int, float)) and isinstance(b[k], (int, float)) else a[k] == b[k] for k in a)


def check_refusal_texts(schema: dict, text: str) -> tuple[list[str], list[str]]:
    errors, notes = [], []
    table = schema.get("x-sgs-refusals") or {}
    for group in ("pairs", "limits", "notices"):
        for rule in table.get(group) or []:
            if rule.get("textSource") == "schema":
                notes.append(f"spec-refusals: {group} {rule.get('id')} is worded by the schema, not quoted from the spec")
            elif rule.get("text") and rule["text"] not in text:
                errors.append(f"spec-refusals: {group} {rule.get('id')} text is not worded as in Spec 38A: {rule['text']!r}")
    return errors, notes


def check_bands(schema: dict, text: str) -> list[str]:
    errors = []
    bands = spec_tokens(text)
    for token, cell in bands.items():
        want = _expected_band(token, cell, bands)
        have = ((schema.get("x-sgs-tokens") or {}).get(token) or {}).get("band")
        if want is None:
            errors.append(f"spec-bands: the §7 band for {token} could not be read ({cell!r})")
        elif not have or not _same(have, want):
            errors.append(f"spec-bands: {token} band {have} differs from §7 ({want})")
    return errors


def _identity(channel: dict, prop: dict) -> str | None:
    comp = channel.get("composition")
    if comp == "product":
        return "1"
    if comp in ("sum", "sum-per-axis"):
        return {"<length>": "0px", "<angle>": "0deg"}.get(prop.get("syntax"))
    if comp == "function-list":
        m = re.search(r"(\w+)\((?:calc\()?[^()]*var\(" + re.escape(prop.get("name", "")) + r"\)", channel.get("formula") or "")
        return {"blur": "0px", "grayscale": "0", "brightness": "1"}.get(m.group(1)) if m else None
    return None


def check_channels(schema: dict, text: str) -> list[str]:
    errors = []
    body = section(text, r"10\. Composition rules")
    intro = next((p for p in body.split("\n\n") if p.strip()), "")
    syntaxes = set(re.findall(r"`(<[a-z-]+>)`", intro))
    spec_rows: dict[str, set[str]] = {}
    cap = None
    for cells in table_rows(body):
        if len(cells) < 2 or cells[0] == "Channel":
            continue
        name = re.match(r"`([^`]+)`", cells[0])
        key = name.group(1) if name else ("injected" if cells[0].startswith("Injected") else cells[0])
        spec_rows[key] = set(re.findall(r"--sgs-[a-z-]+", cells[1]))
        if key == "injected":
            m = re.search(r"at most (\w+) `span\.sgs-motion-layer`", cells[0])
            cap = NUMBER_WORDS.get(m.group(1), None) if m else None
    for ch in schema.get("x-sgs-channels") or []:
        key = ch.get("channel")
        props = [p for o in ch.get("owners") or [] for p in o.get("properties") or []]
        names = {p.get("name") for p in props} | {r for o in ch.get("owners") or [] for r in o.get("reads") or []}
        if key not in spec_rows:
            errors.append(f"spec-channels: channel {key} has no row in the §10 table")
        elif names != spec_rows[key]:
            errors.append(f"spec-channels: {key} owners write {sorted(names)}, §10 lists {sorted(spec_rows[key])}")
        for p in props:
            if syntaxes and p.get("syntax") not in syntaxes:
                errors.append(f"spec-channels: {p.get('name')} syntax {p.get('syntax')} is not one §10 names {sorted(syntaxes)}")
            want = _identity(ch, p)
            if want is not None and p.get("initial") != want:
                errors.append(f"spec-channels: {p.get('name')} initial {p.get('initial')!r} is not the {key} identity {want!r}")
        if key == "injected" and cap is not None and ch.get("maxLayers") != cap:
            errors.append(f"spec-limits: the injected channel caps {ch.get('maxLayers')} layers, §10 says at most {cap}")
    for limit in (schema.get("x-sgs-refusals") or {}).get("limits") or []:
        if limit.get("kind") == "slot-max" and limit.get("slot") == "injected" and cap is not None and limit.get("max") != cap:
            errors.append(f"spec-limits: {limit.get('id')} allows {limit.get('max')} injected layers, §10 says at most {cap}")
    if cap is None:
        errors.append("spec-limits: the §10 injected-layer row's 'at most N' could not be read")
    return errors


def check_triggers(schema: dict, text: str) -> list[str]:
    body = section(text, r"6\.2 Shape")
    found = re.findall(r'"trigger": "([a-z|]+)"', body)
    if len(found) != len(TRIGGER_LAYERS):
        return [f"spec-triggers: the §6.2 shape lists {len(found)} trigger lists, expected {len(TRIGGER_LAYERS)}"]
    errors = []
    defs = schema.get("$defs") or {}
    for name, listed in zip(TRIGGER_LAYERS, found):
        have = set(((defs.get(name) or {}).get("properties") or {}).get("trigger", {}).get("enum") or [])
        if have != set(listed.split("|")):
            errors.append(f"spec-triggers: {name} triggers {sorted(have)} differ from §6.2 ({listed})")
    panels = schema.get("x-sgs-panels") or {}
    want = {"hover": set(found[0].split("|")) | set(found[1].split("|")), "entrance": set(found[2].split("|")), "effects": set(found[4].split("|"))}
    for panel, triggers in want.items():
        if set((panels.get(panel) or {}).get("triggers") or []) != triggers:
            errors.append(f"spec-triggers: x-sgs-panels {panel} triggers differ from §6.2 ({sorted(triggers)})")
    return errors


def spec_pin_errors(schema: dict, text: str) -> tuple[list[str], list[str]]:
    errors, notes = check_refusal_texts(schema, text)
    errors += check_bands(schema, text) + check_channels(schema, text) + check_triggers(schema, text)
    return errors, notes
