"""snapshot_focus_tokens.py: the keyboard-focus tokens every client snapshot carries (focus plan section 2.3, owner decision Q1-B).

One importable home for the rule, shared by the gate and fixer (`check-snapshot-focus-tokens.py`) and the push
guard (`push-theme-snapshot.py::roster_guard`):

  * `settings.custom.focus` holds twelve keys (`FOCUS_KEYS`); WordPress prints each as `--wp--custom--focus--<kebab-key>`;
  * the core ring (`ring` on light grounds, `ringOnDark` on dark grounds) must reach 3:1 against every ground of its
    tone; `inner` against `ink` must reach 9:1. A ground is any opaque palette entry that is not a text, border or
    solid signal colour (`is_ground_slug`): page surfaces, section bands, tints (including the `-light` status tints),
    the brand colours, the footer; a translucent entry is no ground because what shows through it is unknown;
  * the fixer keeps the client's hue: a failing accent is darkened (light grounds) or lightened (dark grounds) in OKLCH
    lightness, the shortest distance that reaches 3:1, and written as a literal hex; the bloom keys stay the true accent;
  * when the shifted colour keeps less than `CHROMA_FLOOR` OKLCH chroma the hue is gone, so the ring falls back to a
    neutral that reaches 3:1 (the site's ink on light grounds, its surface or ink on dark grounds);
  * a hand-set value (any key already present and non-empty) is checked and never overwritten;
  * `settings.custom.focus.source = "draft"` marks the whole object as the client's own draft look (owner decision,
    2026-10-20: a draft's focus styling wins over the contrast rule). Such an object is never recalibrated, and its
    ring and ringOnDark are recorded (`draft_ring_notes`) instead of failed on 3:1; inner/ink and the key set are
    still checked. `offset` and `bloom` are optional shape tokens (`OPTIONAL_KEYS`, read by focus.css) kept as written;
  * the framework file (`theme/sgs-theme/theme.json`) is the generic base, not a client: it keeps the palette-reference
    defaults of plan section 2.3 (`ring` and `ringOnDark` are `var(--wp--preset--color--accent)`), is never shifted, and is
    exempt from the 3:1 ring test (its keys and `inner`/`ink` ratio are still checked). Only client snapshots are derived.

No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import difflib
import importlib.util
import json
import re
from pathlib import Path

import snapshot_palette_roster as roster

SCRIPTS = Path(__file__).resolve().parent
FOCUS_KEYS = ("width", "inner", "ink", "ring", "near", "far", "ringOnDark", "nearOnDark", "farOnDark",
              "signatureA", "signatureB", "signatureC")
# Optional keys: not required of a snapshot, kept as written. `offset` is the ring gap (a CSS length), `bloom` the glow
# strength (0 to 1). `source` marks a draft-sourced look.
OPTIONAL_KEYS = ("offset", "bloom", "source")
DRAFT_SOURCE = "draft"
TEXT_SLUGS = frozenset(("text", "heading", "link", "link-hover", "section-text"))
# Signal colours are icon, text and badge fills; their `-light` tints are the grounds (alert and notice bands).
SIGNAL_SLUGS = frozenset(("success", "error", "info", "warning", "whatsapp"))
MIN_CORE = 3.0
MIN_INK = 9.0
# Below this OKLCH chroma a colour reads as grey: there is no hue left to keep.
CHROMA_FLOOR = 0.04
FALLBACK_INNER = "#ffffff"
FALLBACK_INK = "#0b1020"
L_STEP = 0.005


def _load_oklch():
    spec = importlib.util.spec_from_file_location("derive_dark_palette_maths", SCRIPTS / "derive-dark-palette.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_OK = _load_oklch()


def var(slug: str) -> str:
    return f"var(--wp--preset--color--{slug})"


def norm_hex(value: str | None) -> str | None:
    """`#rrggbb` (lower case, alpha dropped) for any hex form; None otherwise."""
    parsed = roster.parse_hex(value) if isinstance(value, str) else None
    if parsed is None:
        return None
    return "#{:02x}{:02x}{:02x}".format(*(round(c) for c in parsed[:3]))


def ratio(a: str, b: str) -> float:
    r = roster.contrast_ratio(a, b)
    return 0.0 if r is None else r


def tone(hex_colour: str) -> str:
    """'dark' when white text wins (the rule of includes/helpers-colour-wcag.php::sgs_colour_background_tone), else 'light'."""
    w, k = ratio("#ffffff", hex_colour), ratio("#000000", hex_colour)
    if k >= 4.5 and w < 4.5:
        return "light"
    if w >= 4.5 and k < 4.5:
        return "dark"
    return "dark" if w > k else "light"


def resolve(value: object, palette: dict[str, str]) -> str | None:
    return norm_hex(roster.resolve_colour(value, palette))


def is_ground_slug(slug: str) -> bool:
    """False for the slugs that name text, link, border or signal colours (they are drawn on grounds, never behind a
    focus ring): `text`, `heading`, `link`, `link-hover`, `section-text`, `text-*`, `*-text`, `client-text*`, `border*`,
    `*-line`, and the solid `success`, `error`, `info`, `warning`, `whatsapp`."""
    if slug in TEXT_SLUGS or slug in SIGNAL_SLUGS or slug.startswith(("text-", "client-text", "border", "client-border")):
        return False
    return not slug.endswith(("-text", "-line"))


def grounds(snapshot: dict) -> list[tuple[str, str, str]]:
    """(slug, hex, tone) for every palette entry that can be a ground (`is_ground_slug`, opaque, resolving to a colour),
    in palette order."""
    palette = roster.palette_map(snapshot)
    out = []
    for slug in palette:
        if not is_ground_slug(slug):
            continue
        resolved = roster.resolve_colour(palette[slug], palette)
        parsed = roster.parse_hex(resolved) if isinstance(resolved, str) else None
        if parsed is None or parsed[3] < 1.0:
            continue
        h = norm_hex(resolved)
        out.append((slug, h, tone(h)))
    return out


def min_ratio(colour: str, ground_hexes: list[tuple[str, str]]) -> tuple[float | None, str | None]:
    """(lowest ratio, the slug it was on) of `colour` over (slug, hex) grounds; (None, None) when there are none."""
    worst: tuple[float | None, str | None] = (None, None)
    for slug, h in ground_hexes:
        r = ratio(colour, h)
        if worst[0] is None or r < worst[0]:
            worst = (r, slug)
    return worst


def chroma_of(hex_colour: str) -> float:
    return _OK.hex_to_oklch(hex_colour)[1]


def lightness_of(colour: str) -> float:
    return _OK.hex_to_oklch(norm_hex(colour) or colour)[0]


def hue_of(hex_colour: str) -> float:
    return _OK.hex_to_oklch(hex_colour)[2]


def shift_to_contrast(accent: str, ground_hexes: list[tuple[str, str]], direction: int) -> str | None:
    """The accent with OKLCH lightness moved the shortest distance (direction -1 darkens, +1 lightens) until it
    reaches MIN_CORE on every ground. Returns the accent unchanged if it already does; None if no shift can."""
    def passes(h: str) -> bool:
        return all(ratio(h, g) >= MIN_CORE for _, g in ground_hexes)

    if passes(accent):
        return accent
    L0, C0, H0 = _OK.hex_to_oklch(accent)
    L = L0
    while 0.0 < L < 1.0:
        L = min(1.0, max(0.0, L + direction * L_STEP))
        candidate = _OK.oklch_to_hex((L, C0, H0))
        if passes(candidate):
            return candidate
    return None


def _neutral(candidates: list[str], ground_hexes: list[tuple[str, str]], palette: dict[str, str]) -> str | None:
    for ref in candidates:
        h = resolve(ref, palette)
        if h and all(ratio(h, g) >= MIN_CORE for _, g in ground_hexes):
            return ref
    return None


def _decide_ring(accent: str, ground_hexes: list[tuple[str, str]], direction: int, neutrals: list[str],
                 palette: dict[str, str], label: str, notes: list[str]) -> str:
    """The `ring` / `ringOnDark` value: the accent reference, a shifted literal hex, or a neutral reference."""
    if not ground_hexes:
        return var("accent")
    shifted = shift_to_contrast(accent, ground_hexes, direction)
    if shifted == accent:
        return var("accent")
    if shifted is not None and chroma_of(shifted) >= CHROMA_FLOOR:
        notes.append(f"{label}: accent {accent} shifted to {shifted} "
                     f"(hue {hue_of(accent):.1f} -> {hue_of(shifted):.1f} deg OKLCH)")
        return shifted
    why = "no lightness reaches 3:1" if shifted is None else f"chroma {chroma_of(shifted):.3f} is under {CHROMA_FLOOR}"
    pick = _neutral(neutrals, ground_hexes, palette) or neutrals[0]
    notes.append(f"{label}: {why}, falls back to {pick}")
    return pick


def derive_focus(snapshot: dict, framework: bool = False, recalibrate: bool = False) -> tuple[dict, list[str]]:
    """The full `settings.custom.focus` object for this snapshot (hand-set values kept) and the decisions taken.
    `framework=True` writes the palette-reference defaults of plan section 2.3 and shifts no ring. `recalibrate=True`
    recomputes `ring` and `ringOnDark` from the current grounds even when the snapshot already holds a value for them
    (every other present key is still kept)."""
    notes: list[str] = []
    palette = roster.palette_map(snapshot)
    existing = ((snapshot.get("settings") or {}).get("custom") or {}).get("focus")
    existing = existing if isinstance(existing, dict) else {}

    inner, ink = var("surface"), var("text")
    h_inner, h_ink = resolve(inner, palette), resolve(ink, palette)
    if not (h_inner and h_ink and ratio(h_inner, h_ink) >= MIN_INK):
        inner, ink = FALLBACK_INNER, FALLBACK_INK
        notes.append(f"inner/ink: surface/text under {MIN_INK}:1, falls back to {inner}/{ink}")
    inner = existing.get("inner") or inner
    ink = existing.get("ink") or ink
    scratch = {**palette, "__inner": resolve(inner, palette) or FALLBACK_INNER, "__ink": resolve(ink, palette) or FALLBACK_INK}

    accent = resolve(var("accent"), palette)
    gs = grounds(snapshot)
    light = [(s, h) for s, h, t in gs if t == "light"]
    dark = [(s, h) for s, h, t in gs if t == "dark"]
    derived: dict[str, str] = {"width": "2px", "inner": inner, "ink": ink}
    if accent is None:
        notes.append("no resolvable accent: the neutral set is written")
        derived.update(ring=ink, near=inner, far=ink, ringOnDark=ink, nearOnDark=inner, farOnDark=ink)
    else:
        a = var("accent")
        if framework:
            derived["ring"] = derived["ringOnDark"] = a
        else:
            derived["ring"] = _decide_ring(accent, light, -1, [ink, inner], scratch, "ring", notes)
        derived.update(near=a, far=a)
        if not framework:
            derived["ringOnDark"] = _decide_ring(accent, dark, 1, [inner, ink], scratch, "ringOnDark", notes)
        derived.update(nearOnDark=a, farOnDark=a)
    derived.update(signatureA=var("primary"), signatureB=var("accent"), signatureC=var("accent-light"))

    out: dict[str, str] = {}
    draft = existing.get("source") == DRAFT_SOURCE
    for key in FOCUS_KEYS:
        if recalibrate and not framework and not draft and key in ("ring", "ringOnDark"):
            out[key] = derived[key]
        elif isinstance(existing.get(key), str) and existing[key].strip():
            out[key] = existing[key]
            if existing[key] != derived[key]:
                notes.append(f"{key}: hand-set {existing[key]} kept (the fixer would write {derived[key]})")
        else:
            out[key] = derived[key]
    for key, value in existing.items():
        if key not in out:
            out[key] = value
    return out, notes


def focus_of(snapshot: dict) -> dict:
    focus = ((snapshot.get("settings") or {}).get("custom") or {}).get("focus")
    return focus if isinstance(focus, dict) else {}


def draft_sourced(snapshot: dict) -> bool:
    """True when the snapshot's focus object is marked as the client's draft look (`source` is "draft")."""
    return focus_of(snapshot).get("source") == DRAFT_SOURCE


def draft_ring_notes(snapshot: dict) -> list[str]:
    """For a draft-sourced focus object, the measured ring ratios (recorded, never failed): one line per ring key that
    resolves, naming the lowest ratio and its ground. Empty for a snapshot that is not draft-sourced."""
    if not draft_sourced(snapshot):
        return []
    palette = roster.palette_map(snapshot)
    focus = focus_of(snapshot)
    gs = grounds(snapshot)
    notes = []
    for key, want in (("ring", "light"), ("ringOnDark", "dark")):
        value = resolve(focus.get(key), palette)
        low, slug = min_ratio(value, [(s, h) for s, h, t in gs if t == want]) if value else (None, None)
        if low is not None:
            notes.append(f"{key} {value} is {low:.2f}:1 on {slug} (draft-sourced, {'under' if low < MIN_CORE else 'at or over'} {MIN_CORE}:1, not failed)")
    return notes


def missing_focus_keys(snapshot: dict) -> list[str]:
    """The FOCUS_KEYS the snapshot lacks (absent, null or blank), in key order."""
    focus = focus_of(snapshot)
    return [k for k in FOCUS_KEYS if not (isinstance(focus.get(k), str) and focus[k].strip())]


def check_snapshot(snapshot: dict, framework: bool = False) -> list[str]:
    """Problems with this snapshot's focus tokens (empty when it passes). `framework=True` skips the 3:1 ring test."""
    problems = [f"missing key {k}" for k in missing_focus_keys(snapshot)]
    palette = roster.palette_map(snapshot)
    focus = focus_of(snapshot)
    gs = grounds(snapshot)
    absent = set(missing_focus_keys(snapshot))
    for key, want in (("ring", "light"), ("ringOnDark", "dark")):
        if key in absent or framework or draft_sourced(snapshot):
            continue
        value = resolve(focus[key], palette)
        if value is None:
            problems.append(f"{key} does not resolve to a colour ({focus[key]})")
            continue
        low, slug = min_ratio(value, [(s, h) for s, h, t in gs if t == want])
        if low is not None and low < MIN_CORE:
            problems.append(f"{key} {value} is {low:.2f}:1 on {slug}, under {MIN_CORE}:1")
    if not {"inner", "ink"} & absent:
        a, b = resolve(focus["inner"], palette), resolve(focus["ink"], palette)
        if a is None or b is None:
            problems.append("inner or ink does not resolve to a colour")
        elif ratio(a, b) < MIN_INK:
            problems.append(f"inner/ink is {ratio(a, b):.2f}:1, under {MIN_INK}:1 "
                            f"(the fixer offers {FALLBACK_INNER}/{FALLBACK_INK})")
    return problems


# ---------------------------------------------------------------------------
# Text rewriting: the file keeps its indentation, key order and CRLF/LF style.
# ---------------------------------------------------------------------------
def _indent_unit(lines: list[str]) -> str:
    for line in lines:
        m = re.match(r'^([ \t]+)"', line)
        if m:
            return m.group(1)
    raise ValueError("no indented key found: not a pretty-printed JSON file")


def _focus_block(focus: dict, unit: str, base: str, nl: str) -> list[str]:
    i3, i4 = base + unit, base + unit * 2
    body = [f"{i4}{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in focus.items()]
    return [f'{i3}"focus": {{'] + [b + ("," if n < len(body) - 1 else "") for n, b in enumerate(body)] + [f"{i3}}}"]


def write_focus(text: str, focus: dict) -> str:
    """`text` with settings.custom.focus set to `focus`, touching no other line. Raises ValueError if the file's shape
    is not the pretty-printed one, or if the result does not parse to the original plus the focus object."""
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    unit = _indent_unit(lines)
    i2 = unit * 2
    start = None
    for n, line in enumerate(lines):
        if re.fullmatch(re.escape(i2) + r'"custom"\s*:\s*\{\s*', line):
            owner = next((p for p in reversed(lines[:n]) if re.match(re.escape(unit) + r'"', p)), "")
            if owner.startswith(unit + '"settings"'):
                start = n
                break
    if start is None:
        raise ValueError("settings.custom not found at the expected indentation")
    i3 = i2 + unit
    end = next(n for n in range(start + 1, len(lines)) if lines[n].startswith(i2 + "}"))
    block = None
    for n in range(start + 1, end):
        if lines[n].startswith(i3 + '"focus"'):
            close = next(m for m in range(n, end) if re.match(re.escape(i3) + r"\}", lines[m]))
            block = (n, close)
            break
    new_block = _focus_block(focus, unit, i2, nl)
    if block:
        tail = lines[block[1]][len(i3) + 1:]  # whatever follows the closing brace (a comma, or nothing)
        new_block[-1] += tail
        lines[block[0]:block[1] + 1] = new_block
    else:
        if end > start + 1:
            new_block[-1] += ","
        lines[start + 1:start + 1] = new_block
    out = nl.join(lines)
    before, after = json.loads(text), json.loads(out)
    got = after["settings"]["custom"].pop("focus", None)
    before["settings"]["custom"].pop("focus", None)
    if got != focus or before != after:
        raise ValueError("rewrite did not round-trip: refusing to produce the file")
    return out


def unified_diff(old: str, new: str, label: str) -> str:
    return "".join(difflib.unified_diff(old.splitlines(keepends=True), new.splitlines(keepends=True),
                                        fromfile=f"a/{label}", tofile=f"b/{label}"))
