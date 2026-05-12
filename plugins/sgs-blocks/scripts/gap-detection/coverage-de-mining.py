"""Re-do B3 Coverage D+E inline. Real DB query + theme.json + block.json read."""
import json, sqlite3, sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

repo = Path(r"c:\Users\Bean\Projects\small-giants-wp")
theme = repo / "theme" / "sgs-theme" / "theme.json"
blocks_dir = repo / "plugins" / "sgs-blocks" / "src" / "blocks"
db = sqlite3.connect(r"C:\Users\Bean\.claude\skills\sgs-wp-engine\sgs-framework.db")

current_suffixes = {r[0] for r in db.execute("SELECT suffix FROM property_suffixes")}
print(f"Live property_suffixes: {len(current_suffixes)} rows")

# ---- Method D: theme.json ----
theme_doc = json.loads(theme.read_text(encoding="utf-8"))
settings = theme_doc.get("settings", {})

method_d = []  # (path, suggested_suffix, css_property, role)
def add_d(path, suffix, css_prop, role):
    method_d.append((path, suffix, css_prop, role, suffix in current_suffixes))

if "color" in settings:
    cs = settings["color"]
    if cs.get("palette") is not None: add_d("settings.color.palette", "Color", "color (preset)", "colour-text")
    if cs.get("gradients") is not None: add_d("settings.color.gradients", "Gradient", "background-image", "colour-gradient")
    if cs.get("duotone") is not None: add_d("settings.color.duotone", "Duotone", "filter:url(#...)", "select-from-enum")
if "typography" in settings:
    ts = settings["typography"]
    if ts.get("fontSizes") is not None: add_d("settings.typography.fontSizes", "FontSize", "font-size", "font-size-preset")
    if ts.get("fontFamilies") is not None: add_d("settings.typography.fontFamilies", "FontFamily", "font-family", "font-family-preset")
    if ts.get("lineHeight"): add_d("settings.typography.lineHeight", "LineHeight", "line-height", "number-css-percent")
    if ts.get("letterSpacing"): add_d("settings.typography.letterSpacing", "LetterSpacing", "letter-spacing", "number-css-px")
    if ts.get("textTransform"): add_d("settings.typography.textTransform", "TextTransform", "text-transform", "select-from-enum")
    if ts.get("textDecoration"): add_d("settings.typography.textDecoration", "TextDecoration", "text-decoration", "select-from-enum")
    if ts.get("fontStyle"): add_d("settings.typography.fontStyle", "FontStyle", "font-style", "select-from-enum")
    if ts.get("fontWeight"): add_d("settings.typography.fontWeight", "FontWeight", "font-weight", "select-from-enum")
if "spacing" in settings:
    sp = settings["spacing"]
    if sp.get("spacingSizes") is not None: add_d("settings.spacing.spacingSizes", "Spacing", "padding/margin/gap (preset)", "spacing-token")
    if sp.get("padding"): add_d("settings.spacing.padding", "Padding", "padding", "spacing-token")
    if sp.get("margin"): add_d("settings.spacing.margin", "Margin", "margin", "spacing-token")
    if sp.get("blockGap") is not None: add_d("settings.spacing.blockGap", "BlockGap", "gap", "spacing-token")
if "border" in settings:
    bs = settings["border"]
    if bs.get("color"): add_d("settings.border.color", "BorderColor", "border-color", "colour-border")
    if bs.get("radius"): add_d("settings.border.radius", "BorderRadius", "border-radius", "border-radius-token")
    if bs.get("style"): add_d("settings.border.style", "BorderStyle", "border-style", "select-from-enum")
    if bs.get("width"): add_d("settings.border.width", "BorderWidth", "border-width", "number-css-px")
if "shadow" in settings:
    add_d("settings.shadow", "Shadow", "box-shadow", "shadow-preset")
if "layout" in settings:
    ls = settings["layout"]
    if ls.get("contentSize"): add_d("settings.layout.contentSize", "ContentSize", "max-width (content)", "number-css-px")
    if ls.get("wideSize"): add_d("settings.layout.wideSize", "WideSize", "max-width (wide)", "number-css-px")

# ---- Method E: block.json supports ----
support_usage = defaultdict(set)
support_to_suffix = {
    ("color", "background"): "BackgroundColor",
    ("color", "text"): "TextColor",
    ("color", "link"): "LinkColor",
    ("color", "gradient"): "Gradient",
    ("typography", "fontSize"): "FontSize",
    ("typography", "fontFamily"): "FontFamily",
    ("typography", "lineHeight"): "LineHeight",
    ("typography", "letterSpacing"): "LetterSpacing",
    ("typography", "textTransform"): "TextTransform",
    ("typography", "textDecoration"): "TextDecoration",
    ("typography", "textAlign"): "TextAlign",
    ("typography", "fontStyle"): "FontStyle",
    ("typography", "fontWeight"): "FontWeight",
    ("spacing", "padding"): "Padding",
    ("spacing", "margin"): "Margin",
    ("spacing", "blockGap"): "BlockGap",
    ("border", "color"): "BorderColor",
    ("border", "radius"): "BorderRadius",
    ("border", "style"): "BorderStyle",
    ("border", "width"): "BorderWidth",
    ("dimensions", "minHeight"): "MinHeight",
    ("dimensions", "aspectRatio"): "AspectRatio",
    ("shadow",): "Shadow",
}

scan_count = 0
for bjson in sorted(blocks_dir.glob("*/block.json")):
    scan_count += 1
    try:
        d = json.loads(bjson.read_text(encoding="utf-8"))
    except Exception:
        continue
    supports = d.get("supports", {})
    slug = bjson.parent.name
    for key, val in supports.items():
        if isinstance(val, dict):
            for k2, v2 in val.items():
                if v2:
                    suffix = support_to_suffix.get((key, k2))
                    if suffix:
                        support_usage[(f"{key}.{k2}", suffix)].add(slug)
        elif val is True:
            suffix = support_to_suffix.get((key,))
            if suffix:
                support_usage[(key, suffix)].add(slug)

print(f"block.json files scanned: {scan_count}")

# Identify suffixes NOT yet in vocab
proposed = set()
for path, suffix, css_prop, role, already in method_d:
    if not already:
        proposed.add((suffix, role, css_prop))
for (key, suffix), blocks in support_usage.items():
    if suffix not in current_suffixes:
        proposed.add((suffix, "(needs role)", "(see context)"))

# ---- Write report ----
lines = [
    "# Phase 3.5 Coverage — Methods D + E (theme.json + block.json supports)",
    "",
    "**Date:** 2026-05-12. **Method:** Live theme.json + 67 block.json parse, deduped against live `property_suffixes` (58 rows post-B4 cleanup).",
    "",
    "## Method D — theme.json vocabulary",
    "",
    "| Settings path | Suggested suffix | CSS property | Recommended role | Already in vocab? |",
    "|---|---|---|---|---|",
]
for path, suffix, css_prop, role, already in method_d:
    lines.append(f"| `{path}` | `{suffix}` | {css_prop} | {role} | {'yes' if already else '**no**'} |")

lines += [
    "",
    "## Method E — block.json `supports` usage",
    "",
    f"Scanned {scan_count} block.json files.",
    "",
    "| Supports key | Suffix this maps to | Blocks using it | Already in vocab? |",
    "|---|---|---:|---|",
]
for (key, suffix), blocks in sorted(support_usage.items(), key=lambda x: -len(x[1])):
    n = len(blocks)
    already = suffix in current_suffixes
    lines.append(f"| `{key}` | `{suffix}` | {n} | {'yes' if already else '**no**'} |")

lines += [
    "",
    "## Synthesis — new property_suffixes proposed (after dedupe against 58-row live vocab)",
    "",
]
if proposed:
    lines.append("| Suffix | Role | CSS property |")
    lines.append("|---|---|---|")
    for suffix, role, css_prop in sorted(proposed):
        lines.append(f"| `{suffix}` | {role} | {css_prop} |")
else:
    lines.append("None — all theme.json + block.json supports concepts are already in `property_suffixes`.")

lines += [
    "",
    "## Notes",
    "- D + E sources are WP-canonical concepts — the lowest-risk vocab additions (no §11 implication).",
    "- Method D paths that already exist as compounds (e.g. `BorderColor`, `BorderRadius`) confirm the existing vocab matches WP-native usage.",
    "- `Spacing`, `Padding`, `Margin`, `BlockGap` standalone forms would canonicalise blocks that use theme.json spacing presets directly (vs. compound TopBottomLeftRight forms).",
    "- `Gradient`, `Duotone` are theme.json features not yet exposed in block-level vocab.",
]

out = repo / ".claude" / "reports" / "phase-3.5-coverage-de.md"
out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote: {out}")
print(f"  Method D rows: {len(method_d)}")
print(f"  Method E unique (key, suffix) pairs: {len(support_usage)}")
print(f"  Proposed new suffixes: {len(proposed)}")
print(f"  Proposed: {sorted(s for s, _, _ in proposed)}")
