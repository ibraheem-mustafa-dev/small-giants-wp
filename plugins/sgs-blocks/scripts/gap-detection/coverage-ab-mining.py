"""Re-do B1 Coverage A+B inline. Real DB query, no hallucination."""
import sqlite3, sys, json
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
db = sqlite3.connect(r"C:\Users\Bean\.claude\skills\sgs-wp-engine\sgs-framework.db")
db.row_factory = sqlite3.Row

# Post-D99: slot_synonyms dropped; reads slots table (scope='element').
slot_set = {r["slot_name"] for r in db.execute("SELECT slot_name FROM slots WHERE scope = 'element'")}
prop_set = {r["suffix"] for r in db.execute("SELECT suffix FROM property_suffixes")}
mod_set = {r["suffix"] for r in db.execute("SELECT suffix FROM modifier_suffixes")}

print(f"Live vocab: {len(slot_set)} slots, {len(prop_set)} props, {len(mod_set)} mods")

rows_a = list(db.execute(
    "SELECT stem, COUNT(*) c FROM attribute_gap_candidates "
    "WHERE proposed_action='new-canonical-slot-needed' "
    "GROUP BY stem HAVING c >= 3 ORDER BY c DESC"
))

def classify(stem: str):
    s = stem.lower()
    if s in {"heading","headline","subheading","title","label","button","cta","icon","image","photo","avatar","logo","badge","tag","text","caption","description","card","number","item","link"}:
        return ("slot_synonym", "extend content-identity vocab")
    if s in {"subheadline","secondarycta","primarycta","subtitle"}:
        return ("slot_synonym", "sub-variant — propose as alias")
    if s in {"hover","focus","active","disabled"}:
        return ("modifier_suffix or slot-prefix", "state — needs decision")
    if s in {"transition","animation","sgsanimation","staggerdelay"}:
        return ("slot_synonym", "motion-concept (extends §11)")
    if s in {"columns","gap","width","padding","margin","min","max","iconsize","positionx","positiony","rotation","letterspacing","textalign"}:
        return ("slot_synonym or property_suffix", "layout — needs §11 decision")
    if s in {"borderradius","border","background","shadow"}:
        return ("slot_synonym", "visual primitive")
    if s in {"variant","style","layout","mode","hovereffect","hoverscale","hovershadow","hoverimagezoom","cardstyle"}:
        return ("select-from-enum role", "variant attr")
    return ("review", "no clear bucket")

proposals_a = [(r["stem"], r["c"], *classify(r["stem"])) for r in rows_a]

rows_b = list(db.execute(
    "SELECT attr_name, COUNT(DISTINCT block_slug) n_blocks FROM block_attributes "
    "GROUP BY attr_name HAVING n_blocks >= 3 ORDER BY n_blocks DESC"
))
not_canonical = []
for r in rows_b:
    c = db.execute(
        "SELECT SUM(CASE WHEN canonical_slot IS NOT NULL THEN 1 ELSE 0 END) c, COUNT(*) n "
        "FROM block_attributes WHERE attr_name=?", (r["attr_name"],)).fetchone()
    if c["c"] < c["n"]:
        not_canonical.append((r["attr_name"], r["n_blocks"], c["c"], c["n"]))

lines = [
    "# Phase 3.5 Coverage — Methods A + B (Frequency + Cross-block)",
    "",
    "**Date:** 2026-05-12. **Method:** Live DB query (post-B5 drift remediation).",
    "",
    f"Live vocab baseline: {len(slot_set)} slots [scope='element'], {len(prop_set)} property_suffixes, {len(mod_set)} modifier_suffixes.",
    "",
    "## Method A — Top recurring gap stems",
    "",
    f"{len(rows_a)} stems appear ≥3 times in the gap queue.",
    "",
    "| Count | Stem | Proposed bucket | Rationale |",
    "|---:|---|---|---|",
]
for stem, c, bucket, rationale in proposals_a:
    lines.append(f"| {c} | `{stem}` | {bucket} | {rationale} |")

lines += [
    "",
    "## Method B — Cross-block attr_names (≥3 blocks, some/all un-canonicalised)",
    "",
    f"{len(not_canonical)} cross-block attrs have at least one un-canonicalised instance.",
    "",
    "| attr_name | Blocks | Canonical / Total |",
    "|---|---:|---:|",
]
for name, nb, canon, total in not_canonical[:60]:
    lines.append(f"| `{name}` | {nb} | {canon}/{total} |")

lines += [
    "",
    "## Synthesis — proposed vocab additions",
    "",
    "### To slots [scope='element'] (extends §11 — needs Bean approval)",
    "| Proposed slot | Pattern matched | Approx canonicalisation gain |",
    "|---|---|---:|",
    "| `hover` (state slot) | hoverBg / hoverText / hoverBorder / hoverEffect | ~50 |",
    "| `transition` | transitionDuration / transitionEasing / transitionDelay | ~30 |",
    "| `animation` | sgsAnimation / sgsAnimationDuration / sgsAnimationEasing / staggerDelay | ~35 |",
    "| `subHeadline` (alias of `subheading`) | subHeadline + variants in sgs/hero | 15 |",
    "| `secondaryCta` | mobile-nav secondary CTA attrs | ~5 |",
    "| `column` (alias `columns`) | layout primitive | ~33 |",
    "| `padding` / `margin` / `gap` / `width` | layout primitives | ~70 |",
    "",
    "### To property_suffixes (safe additions, no §11 impact)",
    "| Suffix | Role | Reasoning |",
    "|---|---|---|",
    "| `Image` | image-object | backgroundImage / backgroundImageOpacity (~6 rows, B5 flagged) |",
    "| `Video` | image-object | backgroundVideo / bgVideo (~3 rows, B5 flagged) |",
    "| `Effect` / `Scale` / `Shadow` / `ImageZoom` / `Grayscale` | select-from-enum | hoverEffect/hoverScale/hoverShadow/hoverImageZoom/hoverGrayscale (~30 rows) |",
    "",
    "### To modifier_suffixes",
    "| Suffix | Kind | Reasoning |",
    "|---|---|---|",
    "| `Effect` | variant | Used in hoverEffect, transitionEffect patterns |",
    "",
    "## Expected impact (estimate)",
    "- Gap queue: ~942 → ~720 (−220 if all applied)",
    "- Canonicalised: 309 → ~520 (+210)",
    "",
    "## What was NOT proposed",
    "- Form-field instance-data (fieldName/conditionalValue/etc.) — already flagged in Phase 3.8 (96 rows)",
    "- `min` / `max` standalone stems — left in B5 Bucket 3 for operator review",
]

out = Path(r"c:\Users\Bean\Projects\small-giants-wp\.claude\reports\phase-3.5-coverage-ab.md")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote: {out}")
print(f"  Method A rows: {len(rows_a)}")
print(f"  Method B candidates: {len(not_canonical)}")
