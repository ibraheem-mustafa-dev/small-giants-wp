"""
extract-button-presets.py
==========================
Pipeline step: extract a draft mockup's `.sgs-button--{variant}` + `:hover` CSS
into the client theme-snapshot's `settings.custom.buttonPresets`, ACCURATELY and
faithfully (base + hover, every colour + geometry property the draft declares).

This replaces hand-authoring the snapshot buttonPresets — the pipeline collects
the values from the draft, resolving each draft `var(--X)` colour to the client
theme-token slug via the snapshot palette (draft :root hex -> palette hex -> slug),
so the button re-skins per client from theme.json.

Draft BEM `--ghost` is the framework `outline` preset (DB alias convention).

Usage:
    python plugins/sgs-blocks/scripts/extract-button-presets.py \
        --client mamas-munches \
        --mockup sites/mamas-munches/mockups/homepage/index.html

    --dry-run   print the extracted presets without writing the snapshot
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[3]

# Draft BEM modifier -> framework preset name. `ghost` is the DB-aliased outline.
_MODIFIER_TO_PRESET = {"primary": "primary", "secondary": "secondary", "outline": "outline", "ghost": "outline"}

# Which CSS declarations we lift, and the snapshot key they map to.
# Colours (base + hover) are the load-bearing part; geometry is captured too so
# the snapshot is a complete faithful record (the converter chooses what to use).
_BASE_COLOUR = {"background": "background", "background-color": "background", "color": "text", "border-color": "border"}
_HOVER_COLOUR = {"background": "hover-background", "background-color": "hover-background", "color": "hover-text", "border-color": "hover-border"}
_GEOMETRY = {"border-width": "border-width", "border-radius": "border-radius", "padding": "padding",
             "font-size": "font-size", "font-weight": "font-weight", "min-height": "min-height"}

_STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.DOTALL | re.IGNORECASE)
_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}", re.DOTALL)
_DECL_RE = re.compile(r"([\w-]+)\s*:\s*([^;]+)")
_ROOT_BLOCK_RE = re.compile(r":root\s*\{([^}]*)\}", re.DOTALL)
_CUSTOM_PROP_RE = re.compile(r"--([a-zA-Z0-9-]+)\s*:\s*([^;]+);")
_HEX_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")
_VAR_RE = re.compile(r"var\(\s*--([a-zA-Z0-9-]+)\s*\)")


def _read_css(mockup: Path) -> str:
    html = mockup.read_text(encoding="utf-8")
    return "\n".join(_STYLE_BLOCK_RE.findall(html))


def _draft_root_map(css: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for block in _ROOT_BLOCK_RE.findall(css):
        for m in _CUSTOM_PROP_RE.finditer(block):
            name, val = m.group(1).strip().lower(), m.group(2).strip()
            if _HEX_RE.match(val):
                out[name] = val.lower()
    return out


def _palette_map(snapshot: dict) -> dict[str, str]:
    """{hex(lower): theme-slug} from the snapshot palette."""
    out: dict[str, str] = {}
    palette = ((snapshot.get("settings") or {}).get("color") or {}).get("palette") or []
    for entry in palette:
        slug, colour = entry.get("slug"), (entry.get("color") or "")
        if slug and _HEX_RE.match(str(colour).strip()):
            out.setdefault(str(colour).strip().lower(), slug)
    return out


def _resolve_colour(raw: str, draft_root: dict[str, str], palette: dict[str, str]) -> str:
    """Resolve a draft colour value to `var(--wp--preset--color--{slug})`.

    `transparent`/`none` -> that keyword (the converter maps it to '' = no colour).
    `var(--X)` -> draft :root hex -> palette slug -> theme token; unknown -> raw.
    A raw hex is snapped to a palette slug when it matches, else kept verbatim.
    """
    raw = raw.strip()
    low = raw.lower()
    if low in ("transparent", "none", ""):
        return low or "transparent"
    m = _VAR_RE.search(raw)
    if m:
        name = m.group(1).lower()
        if name.startswith("wp--preset--color--"):
            return raw  # already a theme token
        hexv = draft_root.get(name)
        if hexv:
            slug = palette.get(hexv.lower())
            return f"var(--wp--preset--color--{slug})" if slug else hexv
        return raw
    if _HEX_RE.match(raw):
        slug = palette.get(low)
        return f"var(--wp--preset--color--{slug})" if slug else raw
    return raw


def _match_variant(selector: str) -> tuple[str, bool] | None:
    """Return (preset_name, is_hover) for a `.sgs-button--{mod}` selector, else None."""
    sel = selector.strip()
    m = re.search(r"\.sgs-button--([a-z0-9-]+)", sel)
    if not m:
        return None
    preset = _MODIFIER_TO_PRESET.get(m.group(1).lower())
    if not preset:
        return None
    return preset, (":hover" in sel or ":focus" in sel)


def extract(css: str, draft_root: dict[str, str], palette: dict[str, str]) -> dict:
    """Build the buttonPresets dict from the draft CSS."""
    # base .sgs-button (shared geometry inherited by every variant)
    base_geom: dict[str, str] = {}
    presets: dict[str, dict] = {}

    for sel_group, body in _RULE_RE.findall(css):
        decls = {d.group(1).strip().lower(): d.group(2).strip() for d in _DECL_RE.finditer(body)}
        for selector in sel_group.split(","):
            selector = selector.strip()
            # base rule: exactly `.sgs-button` (no modifier, no pseudo)
            if re.fullmatch(r"\.sgs-button", selector):
                for css_key, snap_key in _GEOMETRY.items():
                    if css_key in decls:
                        base_geom[snap_key] = decls[css_key]
                continue
            mv = _match_variant(selector)
            if not mv:
                continue
            preset, is_hover = mv
            entry = presets.setdefault(preset, collections.OrderedDict())
            colour_map = _HOVER_COLOUR if is_hover else _BASE_COLOUR
            for css_key, snap_key in colour_map.items():
                if css_key in decls:
                    entry[snap_key] = _resolve_colour(decls[css_key], draft_root, palette)
            if not is_hover:
                for css_key, snap_key in _GEOMETRY.items():
                    if css_key in decls:
                        entry[snap_key] = decls[css_key]

    # Fold base geometry in as each preset's default (variant-specific overrides win).
    for preset, entry in presets.items():
        for snap_key, val in base_geom.items():
            entry.setdefault(snap_key, val)
        # Re-order: colours first, then geometry, for a readable snapshot.
        ordered = collections.OrderedDict()
        for k in ("background", "text", "border", "border-width", "border-radius",
                  "padding", "font-size", "font-weight", "min-height",
                  "hover-background", "hover-text", "hover-border"):
            if k in entry:
                ordered[k] = entry[k]
        for k, v in entry.items():
            ordered.setdefault(k, v)
        presets[preset] = ordered
    return presets


def main() -> int:
    ap = argparse.ArgumentParser(description="Extract draft button presets into the client snapshot")
    ap.add_argument("--client", required=True)
    ap.add_argument("--mockup", required=True, help="Path to the draft mockup HTML")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    mockup = Path(args.mockup)
    if not mockup.is_absolute():
        mockup = REPO_ROOT / mockup
    snap_path = REPO_ROOT / "sites" / args.client / "theme-snapshot.json"
    if not snap_path.exists():
        print(f"FATAL: snapshot not found: {snap_path}")
        return 1

    css = _read_css(mockup)
    snapshot = json.loads(snap_path.read_text(encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    draft_root = _draft_root_map(css)
    palette = _palette_map(snapshot)
    presets = extract(css, draft_root, palette)

    print(f"Extracted {len(presets)} preset(s) from {mockup.name}:")
    for name, vals in presets.items():
        print(f"  --- {name} ---")
        for k, v in vals.items():
            print(f"      {k}: {v}")

    if args.dry_run:
        print("\n[dry-run] snapshot NOT written.")
        return 0

    snapshot.setdefault("settings", collections.OrderedDict()).setdefault("custom", collections.OrderedDict())
    snapshot["settings"]["custom"]["buttonPresets"] = presets
    snap_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote buttonPresets to {snap_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
