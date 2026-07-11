#!/usr/bin/env python3
"""One-shot: standardise per-block hover attrs to the SUFFIX convention `{base}Hover`.

Rationale (D309 prep): hover is a modifier suffix like the responsive tiers
(`{attr}Tablet`/`Mobile`) and like button's existing `textDecorationHover`. The
converter can then route hover uniformly (re-append `Hover` from
modifier_suffixes(kind='state')) with zero per-convention code. The central
`sgsHover*` extension namespace is SEPARATE and NOT touched here.

Word-boundary regex + longest-key-first per block prevents substring corruption
(`hoverBackground` inside `hoverBackgroundColour`). Dry-run unless --apply.
"""
import re
import sys
from pathlib import Path

BLOCKS = Path(__file__).resolve().parent.parent / "src" / "blocks"

# block -> {old_attr: new_attr}. Exact per the rename-map enumeration.
RENAME = {
    "button": {"hoverScale": "scaleHover"},
    "brand-strip": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
        "hoverEffect": "effectHover",
    },
    "cta-section": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
    },
    "card-grid": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
        "hoverEffect": "effectHover",
        "hoverScale": "scaleHover",
        "hoverShadow": "shadowHover",
        "hoverImageZoom": "imageZoomHover",
        "hoverGrayscale": "grayscaleHover",
    },
    "gallery": {
        "hoverOverlayColour": "overlayColourHover",
        "hoverEffect": "effectHover",
        "hoverScale": "scaleHover",
        "hoverImageZoom": "imageZoomHover",
        "hoverGrayscale": "grayscaleHover",
        "hoverShadow": "shadowHover",
    },
    "heading": {
        "hoverColour": "textColourHover",
        "hoverBackground": "backgroundColourHover",
        "hoverScale": "scaleHover",
    },
    "hero": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
    },
    "icon": {
        "hoverIconColour": "iconColourHover",
        "hoverShapeColour": "shapeColourHover",
        "hoverScale": "scaleHover",
    },
    "info-box": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
        "hoverEffect": "effectHover",
        "hoverScale": "scaleHover",
        "hoverShadow": "shadowHover",
        "hoverGrayscale": "grayscaleHover",
    },
    "post-grid": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
        "hoverScale": "scaleHover",
        "hoverShadow": "shadowHover",
        "hoverImageZoom": "imageZoomHover",
    },
    "process-steps": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
        "hoverEffect": "effectHover",
    },
    "quote": {
        "hoverColour": "textColourHover",
        "hoverBackground": "backgroundColourHover",
        "hoverScale": "scaleHover",
    },
    "social-icons": {"hoverColour": "iconColourHover"},
    "team-member": {
        "hoverScale": "scaleHover",
        "hoverShadow": "shadowHover",
        "hoverImageZoom": "imageZoomHover",
        "hoverGrayscale": "grayscaleHover",
        "hoverOverlay": "overlayHover",
    },
    "testimonial": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
        "hoverEffect": "effectHover",
        "hoverScale": "scaleHover",
        "hoverShadow": "shadowHover",
    },
    "testimonial-slider": {
        "hoverBackgroundColour": "backgroundColourHover",
        "hoverTextColour": "textColourHover",
        "hoverBorderColour": "borderColourHover",
        "hoverEffect": "effectHover",
    },
    "text": {
        "hoverColour": "textColourHover",
        "hoverBackground": "backgroundColourHover",
        "hoverScale": "scaleHover",
    },
}

# Collision guard: no NEW name may already exist as a DIFFERENT attr in the block's files.
FILE_GLOBS = ("*.json", "*.php", "*.js")


def rename_block(slug: str, mapping: dict, apply: bool) -> list[str]:
    lines: list[str] = []
    bdir = BLOCKS / slug
    if not bdir.is_dir():
        return [f"  !! MISSING DIR {bdir}"]
    # longest old-key first so `hoverBackgroundColour` is replaced before `hoverBackground`
    ordered = sorted(mapping.items(), key=lambda kv: -len(kv[0]))
    for f in sorted(p for g in FILE_GLOBS for p in bdir.glob(g)):
        text = f.read_text(encoding="utf-8")
        orig = text
        per_file: list[str] = []
        for old, new in ordered:
            # collision: NEW already present as a standalone identifier before rename?
            if re.search(r"\b" + re.escape(new) + r"\b", text) and not re.search(
                r"\b" + re.escape(old) + r"\b", text
            ):
                per_file.append(f"      ~ {new} already present (no {old}) — skip/verify")
            n = len(re.findall(r"\b" + re.escape(old) + r"\b", text))
            if n:
                text = re.sub(r"\b" + re.escape(old) + r"\b", new, text)
                per_file.append(f"      {old} -> {new}  ({n})")
        if text != orig:
            lines.append(f"    {f.name}:")
            lines.extend(per_file)
            if apply:
                f.write_text(text, encoding="utf-8")
    return lines or ["    (no changes)"]


def main() -> None:
    apply = "--apply" in sys.argv
    print(f"{'APPLYING' if apply else 'DRY RUN'} hover-attr suffix rename\n")
    total_blocks = 0
    for slug, mapping in RENAME.items():
        out = rename_block(slug, mapping, apply)
        print(f"  {slug}:")
        for ln in out:
            print(ln)
        total_blocks += 1
    print(f"\n{total_blocks} blocks processed.")


if __name__ == "__main__":
    main()
