#!/usr/bin/env python3
"""extract.py — the Spec 33 draft global-styles extractor (CLI orchestrator).

Reads a draft mockup, MEASURES computed values on the rendered page (measure.js), parses the
DECLARED CSS for names/roles (token_map/roles), reconciles them (COMPUTED VALUE WINS — the iron
law), and emits a complete, valid ``theme-snapshot.json`` (theme.json v3) + a provenance
``theme-extract-trace.json``. Proves on Mama's; kills the D303 base-inheritance drift.

Usage:
  python extract.py --client mamas-munches --draft <index.html> [--facts <computed-facts.json>]
                    [--out <snapshot.json>] [--repo-root <path>]

If ``--facts`` is omitted, measure.js is run live (needs Playwright). Passing a cached facts file
makes the run deterministic + browser-free (used by the golden/determinism tests).
"""
from __future__ import annotations

import argparse
import copy
import json
import pathlib
import re
import subprocess
import sys

import palette as palette_mod
import presets as presets_mod
import typography as typo_mod
from schema_validate import validate_theme_json
from token_map import build_draft_root_token_map, parse_base_rules

HERE = pathlib.Path(__file__).resolve().parent


def _repo_root(arg: str | None) -> pathlib.Path:
    if arg:
        return pathlib.Path(arg).resolve()
    # scripts/theme-extractor → repo root is 4 up
    return HERE.parents[3]


def extract_css(html: str) -> str:
    """Concatenate every inline ``<style>`` block (Mama's draft is single-file inline CSS)."""
    return "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.DOTALL | re.I))


def run_measure(draft: pathlib.Path) -> dict:
    out = subprocess.run(
        ["node", str(HERE / "measure.js"), "--draft", str(draft)],
        capture_output=True, text=True, timeout=120,
    )
    if out.returncode != 0:
        raise RuntimeError(f"measure.js failed: {out.stderr[:500]}")
    return json.loads(out.stdout)


def _overlay_font_families(baseline: dict, facts: dict, links: list, trace: list) -> None:
    fams = baseline.setdefault("settings", {}).setdefault("typography", {}).setdefault("fontFamilies", [])
    by_slug = {f.get("slug"): f for f in fams}
    body_stack = typo_mod.representative_paragraph(facts)
    body_fam = (body_stack or facts.get("body", {})).get("fontFamily") or "sans-serif"
    head_fam = facts.get("headings", {}).get("h1", {}).get("fontFamily") \
        or facts.get("headings", {}).get("h2", {}).get("fontFamily") or body_fam
    if "body" in by_slug:
        by_slug["body"]["fontFamily"] = body_fam
        by_slug["body"]["_source"] = "declared"
    for slug in ("heading", "display"):
        if slug in by_slug:
            by_slug[slug]["fontFamily"] = head_fam
            by_slug[slug]["name"] = f"{slug.title()} ({head_fam.split(',')[0].strip()})"
            by_slug[slug].pop("fontFace", None)  # stale baseline face; real face loaded via font link
            by_slug[slug]["_source"] = "declared"
    if links:
        baseline["settings"].setdefault("custom", {})["fontLinks"] = sorted(set(links))
        trace.append({"kind": "font-loading", "reason": "draft font <link>/@import hrefs carried",
                      "links": sorted(set(links)),
                      "note": "PARTIAL: heading face loads via link on the live page; theme.json "
                              "woff2 fontFace embedding is a follow-up (FR-33-3 sub-clause)"})


def build_snapshot(client: str, css: str, facts: dict, html: str, baseline: dict, trace: list) -> dict:
    root_tokens = build_draft_root_token_map(css)
    base_rules = parse_base_rules(css)

    snap = copy.deepcopy(baseline)
    settings = snap.setdefault("settings", {})
    styles = snap.setdefault("styles", {})

    # PALETTE (FR-33-1/2/9)
    pal = palette_mod.build_palette(root_tokens, base_rules, facts, trace)
    settings.setdefault("color", {})["palette"] = pal
    slug_by_hex = {e["color"].lower(): e["slug"] for e in pal if e["color"].startswith("#")}

    # BASE TYPOGRAPHY (FR-33-3 — the drift-killer)
    styles["typography"] = typo_mod.base_typography(facts, trace)

    # styles.color: computed body bg/text → slugs
    body = facts.get("body", {})
    bg_hex = _hex(body.get("backgroundColor", ""))
    txt_hex = _hex(body.get("color", ""))
    styles["color"] = {
        "background": _var_or_hex(bg_hex, slug_by_hex, "color"),
        "text": _var_or_hex(txt_hex, slug_by_hex, "color"),
    }

    # HEADING base + per-level element styles (regenerated from computed — no fabricated 1.15)
    hbase = typo_mod.heading_base(facts, trace)
    elements = styles.setdefault("elements", {})
    elements["heading"] = {"typography": {"lineHeight": hbase["lineHeight"],
                                          "fontFamily": "var:preset|font-family|heading"}}
    if "letterSpacing" in hbase:
        elements["heading"]["typography"]["letterSpacing"] = hbase["letterSpacing"]
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        h = facts.get("headings", {}).get(tag)
        if not h or h.get("inChrome"):
            elements.pop(tag, None)
            continue
        elements[tag] = {"typography": {"fontFamily": "var:preset|font-family|heading",
                                        "lineHeight": hbase["lineHeight"]}}

    # FONT FAMILIES + font loading
    _overlay_font_families(snap, facts, presets_mod.font_links(html), trace)

    # BUTTON PRESETS (FR-33-4 open bag)
    bp = presets_mod.build_button_presets(facts, trace)
    if bp:
        settings.setdefault("custom", {})["buttonPresets"] = bp

    # LAYOUT contentSize (scan beyond :root)
    cs = presets_mod.content_size(base_rules, trace)
    if cs:
        settings.setdefault("layout", {})["contentSize"] = cs

    snap["title"] = f"{client} (generated by Spec 33 extractor)"
    snap["description"] = "Draft-generated global styles — DO NOT hand-edit; regenerate via extract.py."
    return snap


def merge_onto(snap: dict, existing: dict, trace: list) -> dict:
    """ADDITIVELY merge the generated ``snap`` onto an EXISTING client snapshot (FR-33-11 non-destruct).

    The generated globals/base/palette WIN (they carry the drift fix); but every EXISTING slug the
    generated palette does NOT cover is PRESERVED (warm-axis / aliases / colours the draft can't
    provide), as is the client's hand-authored component CSS + pattern refs. This is what makes a
    deploy to an already-cloned site non-breaking (the D318 pink regression = a destructive replace).
    """
    gen_slugs = {e.get("slug") for e in snap.get("settings", {}).get("color", {}).get("palette", [])}
    ex_pal = existing.get("settings", {}).get("color", {}).get("palette", []) or []
    added = 0
    for e in ex_pal:
        if e.get("slug") and e.get("slug") not in gen_slugs:
            snap.setdefault("settings", {}).setdefault("color", {}).setdefault("palette", []).append(e)
            added += 1
    ex_styles, ex_custom = existing.get("styles", {}), existing.get("settings", {}).get("custom", {})
    for key in ("css", "blocks"):
        if ex_styles.get(key) and not snap.get("styles", {}).get(key):
            snap.setdefault("styles", {})[key] = ex_styles[key]
    for key in ("sgs", "maxWidth"):
        if key in ex_custom:
            snap.setdefault("settings", {}).setdefault("custom", {})[key] = ex_custom[key]
    trace.append({"kind": "merge", "reason": f"additive merge onto existing snapshot: {added} extra "
                  f"palette slug(s) preserved + component css/blocks/patterns carried forward"})
    return snap


def _hex(v: str):
    from colour import parse_colour
    c = parse_colour(v)
    return c.hex if c else None


def _var_or_hex(hexv, slug_by_hex, kind):
    if hexv and hexv in slug_by_hex:
        return f"var:preset|color|{slug_by_hex[hexv]}"
    return hexv or ""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Spec 33 draft global-styles extractor")
    ap.add_argument("--client", required=True)
    ap.add_argument("--draft", required=True)
    ap.add_argument("--facts", default=None, help="cached computed-facts.json (skips measure.js)")
    ap.add_argument("--out", default=None)
    ap.add_argument("--trace", default=None)
    ap.add_argument("--repo-root", default=None)
    ap.add_argument("--merge-onto", default=None,
                    help="path to an EXISTING client snapshot — additively preserve its extra palette "
                         "slugs + component CSS (non-destructive deploy to an already-cloned site)")
    args = ap.parse_args(argv)

    repo = _repo_root(args.repo_root)
    draft = pathlib.Path(args.draft).resolve()
    html = draft.read_text(encoding="utf-8")
    css = extract_css(html)
    if not css.strip():
        print("HALT: no CSS found in draft (parser/empty).", file=sys.stderr)
        return 3

    facts = json.loads(pathlib.Path(args.facts).read_text(encoding="utf-8")) if args.facts \
        else run_measure(draft)

    baseline = json.loads((repo / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))

    trace: list = []
    snap = build_snapshot(args.client, css, facts, html, baseline, trace)

    if args.merge_onto:
        existing_path = pathlib.Path(args.merge_onto)
        if existing_path.is_file():
            snap = merge_onto(snap, json.loads(existing_path.read_text(encoding="utf-8")), trace)

    ok, errors = validate_theme_json(snap)
    if not ok:
        print("HALT: emitted snapshot failed theme.json v3 schema validation:", file=sys.stderr)
        for e in errors[:10]:
            print("  -", e, file=sys.stderr)
        return 4

    out_path = pathlib.Path(args.out) if args.out else (repo / "sites" / args.client / "theme-snapshot.generated.json")
    trace_path = pathlib.Path(args.trace) if args.trace else out_path.with_name("theme-extract-trace.json")
    out_path.write_text(json.dumps(snap, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    trace_path.write_text(json.dumps(trace, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")
    print(f"Wrote {trace_path}  ({len(trace)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
