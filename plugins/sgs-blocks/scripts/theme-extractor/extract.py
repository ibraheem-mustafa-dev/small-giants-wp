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
import subprocess
import sys

import derive as derive_mod
import palette as palette_mod
import presets as presets_mod
import typography as typo_mod
from schema_validate import validate_theme_json
from token_map import build_draft_root_token_map, parse_base_rules

HERE = pathlib.Path(__file__).resolve().parent

# scripts/ (HERE.parent) holds shared_utils — the SINGLE source of the CSS-extraction
# + hashing the FR-33-12 freshness gate depends on (both this extractor and the
# orchestrator call it, so the two hashes can never drift). See shared_utils.py.
if str(HERE.parent) not in sys.path:
    sys.path.insert(0, str(HERE.parent))
from shared_utils import extract_css, css_sha256  # noqa: E402

# Version of THIS extractor's emit logic — stamped into the snapshot's `_sgsExtractor`
# provenance block. Bump when palette/typography/preset extraction changes materially
# (independent of shared_utils' hash-helper version, which rarely moves).
EXTRACTOR_VERSION = "1.0"


def _repo_root(arg: str | None) -> pathlib.Path:
    if arg:
        return pathlib.Path(arg).resolve()
    # scripts/theme-extractor → repo root is 4 up
    return HERE.parents[3]


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

    # PALETTE — Pass A (declared :root, FR-33-1/2/9); Pass B advisory fallback when the draft declares
    # no tokens (FR-33-5). Nothing usable → keep the deep-copied framework baseline palette UNCHANGED.
    pal = palette_mod.build_palette(root_tokens, base_rules, facts, trace)
    if not pal:
        pal = derive_mod.derive_palette(base_rules, trace)  # Pass B (advisory) or []
    if pal:
        settings.setdefault("color", {})["palette"] = pal
    else:
        pal = ((settings.get("color", {}) or {}).get("palette", [])) or []  # baseline (from deepcopy)
        trace.append({"kind": "derive-skip", "reason": "Pass A + Pass B recovered nothing usable → "
                      "framework baseline palette kept UNCHANGED (never a guessed theme)"})
    slug_by_hex = {e["color"].lower(): e["slug"] for e in pal
                   if isinstance(e.get("color"), str) and e["color"].startswith("#")}

    # BASE TYPOGRAPHY (FR-33-3 — the drift-killer)
    styles["typography"] = typo_mod.base_typography(facts, trace)

    # styles.color: computed content-background + body text → slugs (FR-33-6)
    body = facts.get("body", {})
    bg_hex = _hex(_theme_background(facts, trace))
    txt_hex = _hex(body.get("color", ""))
    styles["color"] = {
        "background": _var_or_hex(bg_hex, slug_by_hex, "color"),
        "text": _var_or_hex(txt_hex, slug_by_hex, "color"),
    }

    # HEADING base (regenerated from computed — no fabricated 1.15). MERGE onto the framework
    # baseline's existing elements.heading dict — never overwrite wholesale. The baseline (deepcopy'd
    # at the top of this function) already carries properties this extractor does not measure
    # (heading.color.text, heading.typography.fontWeight); replacing the dict instead of merging into
    # it silently drops them from every heading on the live site — the same destructive-overwrite
    # class as the D319 palette lesson, just one level down the tree.
    hbase = typo_mod.heading_base(facts, trace)
    elements = styles.setdefault("elements", {})
    heading_typ = elements.setdefault("heading", {}).setdefault("typography", {})
    heading_typ["lineHeight"] = hbase["lineHeight"]
    heading_typ["fontFamily"] = "var:preset|font-family|heading"
    if "letterSpacing" in hbase:
        heading_typ["letterSpacing"] = hbase["letterSpacing"]
    # Per-level h1..h6 overrides. A tag with NO non-chrome measurement is a BLIND SPOT, not a
    # measurement of absence — the framework baseline for that tag SURVIVES UNTOUCHED. This is the
    # same principle as the buttonPresets merge below: the extractor may only overwrite what it has
    # actually measured. Deleting the baseline instead would STRIP that heading level from the live
    # site, because push-theme-snapshot replaces theme.json wholesale — proven against the live
    # palestine-lives theme.json, which carries h5 (medium/700) + h6 (small/700/uppercase/0.08em)
    # that the Indus draft never renders and therefore cannot speak for.
    #
    # Chrome exclusion still holds, and is the POINT: Mama's renders h5 ONLY in its footer at 11px,
    # and that chrome value must never drive the global h5 scale. Skipping the override achieves that
    # WITHOUT deleting the baseline — the two are independent, and conflating them was the bug.
    #
    # For a MEASURED tag, merge rather than replace: fontSize/fontFamily/lineHeight are derived (they
    # win), while properties the extractor never derives (h6's fontWeight/letterSpacing/textTransform)
    # are blind spots that must survive.
    hsizes = typo_mod.heading_sizes(facts, trace)
    skipped = []
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        h = facts.get("headings", {}).get(tag)
        if not h or h.get("inChrome"):
            skipped.append(tag)
            continue
        tag_typ = elements.setdefault(tag, {}).setdefault("typography", {})
        tag_typ["fontFamily"] = "var:preset|font-family|heading"
        tag_typ["lineHeight"] = hbase["lineHeight"]
        if tag in hsizes:
            tag_typ["fontSize"] = hsizes[tag]
    if skipped:
        trace.append({"kind": "base", "what": "styles.elements.h1..h6",
                      "reason": "no non-chrome measurement for these levels — framework baseline "
                                "PRESERVED untouched (blind spot, not measured-absent; deleting it "
                                "would strip the level from the live site)",
                      "baseline_preserved": ",".join(skipped)})

    # FONT FAMILIES + font loading
    _overlay_font_families(snap, facts, presets_mod.font_links(html), trace)

    # BUTTON PRESETS (FR-33-4 open bag) — MERGED onto the framework baseline, never replaced.
    #
    # Two distinct non-destructive requirements, both proven necessary on Indus:
    #   (a) SLOT level — the draft defines only the slots it happens to use (Indus derives `outline`
    #       alone). A wholesale replace DELETED the baseline's `primary` + `secondary` presets; since
    #       push-theme-snapshot REPLACES the live theme.json, that strips them from the site — and
    #       Indus's buttons use exactly those.
    #   (b) KEY level — even for a slot the draft DOES define, `_rest_entry` only ever derives
    #       background/text/border/border-width/border-radius/font-size/font-weight/min-height
    #       (presets.py). `padding` is NOT in that vocabulary at all, so a slot-level replace drops
    #       the baseline padding from a slot the extractor never measured padding for. A key the
    #       extractor cannot derive is a blind spot, not a measurement of absence — the baseline must
    #       survive it.
    #
    # A derived key always WINS over the baseline key (it is the measured client value, the FR-33-1
    # iron law). This is ordinary theme.json layering (baseline → client override), and it is the
    # same destructive-replace class as the D319 palette lesson + the elements.heading fix above.
    bp = presets_mod.build_button_presets(facts, trace)
    if bp:
        presets = settings.setdefault("custom", {}).setdefault("buttonPresets", {})
        for slot, derived in bp.items():
            base_slot = presets.setdefault(slot, {})
            kept = [k for k in base_slot if k not in derived]
            base_slot.update(derived)
            trace.append({"kind": "merge", "what": f"buttonPresets.{slot}",
                          "reason": "derived keys overlaid onto the framework baseline preset; "
                                    "baseline keys the extractor cannot derive are preserved",
                          "overridden": ",".join(sorted(derived)) or "(none)",
                          "preserved_from_baseline": ",".join(sorted(kept)) or "(none)"})
        untouched = [s for s in presets if s not in bp]
        if untouched:
            trace.append({"kind": "merge", "what": "buttonPresets",
                          "reason": "baseline preset slots the draft does not define are preserved "
                                    "whole (a wholesale replace would delete them from the live site)",
                          "preserved_slots": ",".join(sorted(untouched))})

    # LAYOUT contentSize (scan beyond :root)
    cs = presets_mod.content_size(base_rules, trace)
    if cs:
        settings.setdefault("layout", {})["contentSize"] = cs

    # FR-33-13 — RESERVE the header/footer COMPONENT namespace for Part 2 (Spec 17). Part 1 owns
    # GLOBAL/base + generic presets only; Part 2's header/footer tokens (sticky/scrolled header bg,
    # header height, logo max-height, nav-link hover, mobile-nav breakpoint, footer tokens) land in
    # settings.custom.header / .footer so Part 2 does not force a Part 1 re-spec. Reserved as empty
    # objects (WP emits no CSS var from an empty custom object — inert).
    # RECONCILIATION NOTE (Bean-directed 2026-07-13): Spec 17's BUILT header/footer styling drives
    # those values via the Customiser (wp_options) + inline wp_head CSS + a JS-measured
    # --sgs-header-height, NOT this theme.json namespace. So Part 2 must DECIDE tokenise-vs-Customiser
    # before populating this — the header height in particular is dynamic and would contend with a
    # static token. This reservation is a claim of the namespace, not an adoption of a delivery model.
    _custom = settings.setdefault("custom", {})
    _custom.setdefault("header", {})
    _custom.setdefault("footer", {})

    snap["title"] = f"{client} (generated by Spec 33 extractor)"
    snap["description"] = "Draft-generated global styles — DO NOT hand-edit; regenerate via extract.py."

    # FR-33-12 — embed the freshness key INSIDE the snapshot itself (not a sibling file).
    # The /sgs-clone orchestrator reads THIS block from the exact `theme-snapshot.json` the
    # converter's colour-snap loads, so the gate proves the file-that-is-used is fresh for the
    # current draft (a sibling record could drift from the deployed file). WP ignores this
    # unknown top-level key; push-theme-snapshot pushes only styles+settings, never this block;
    # `merge_onto` keeps it (the generated snapshot is the merge base). Deterministic (no timestamp).
    snap["_sgsExtractor"] = {
        "draft_css_sha256": css_sha256(css),
        "extractor_version": EXTRACTOR_VERSION,
    }
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

    # styles.elements — preserve the client's hand-authored element keys the extractor never derives
    # (e.g. `button.typography.textDecoration`, which exists only in the client snapshot and was
    # dropped on every re-run). Fill-only: an existing leaf is carried across ONLY where the generated
    # snapshot has no value, so a generated (measured) value always wins.
    #
    # No h-tag exception is needed here: build_snapshot no longer deletes a heading level it cannot
    # measure (it leaves the framework baseline standing), so there is no "popped" state for a prior
    # snapshot to resurrect. Fill-only is safe for every element uniformly.
    ex_elements = ex_styles.get("elements", {}) or {}
    gen_elements = snap.setdefault("styles", {}).setdefault("elements", {})

    def _fill_only(dst: dict, src: dict) -> int:
        """Recursively add keys from ``src`` that ``dst`` lacks. Never overwrites. Returns count."""
        n = 0
        for k, v in src.items():
            if isinstance(v, dict):
                if not isinstance(dst.get(k), dict):
                    if k in dst:
                        continue        # a non-dict generated value stands
                    dst[k] = {}
                n += _fill_only(dst[k], v)
            elif k not in dst:
                dst[k] = v
                n += 1
        return n

    el_filled = 0
    for name, val in ex_elements.items():
        if isinstance(val, dict):
            el_filled += _fill_only(gen_elements.setdefault(name, {}), val)
    trace.append({"kind": "merge", "what": "styles.elements",
                  "reason": "fill-only carry of client element keys the extractor does not derive "
                            "(generated/measured values always win)",
                  "keys_preserved": el_filled})

    trace.append({"kind": "merge", "reason": f"additive merge onto existing snapshot: {added} extra "
                  f"palette slug(s) preserved + component css/blocks/patterns carried forward"})
    return snap


def _theme_background(facts: dict, trace: list) -> str:
    """FR-33-6 — the theme background = the COMPUTED background of the widest block-level ancestor that
    CONTAINS the main content flow, NOT ``<body>`` blindly.

    A dark background is discarded ONLY on a POSITIVE preview-shell signal (a matched marker element,
    with its DOM path): the shell wrapper + everything enclosing it (body/html) are excluded, so the
    widest CONTENT region INSIDE the shell wins. With no marker, the widest content-containing
    candidate wins even if dark — a legit dark-branded site keeps its dark background (never discarded
    by darkness alone). Ambiguous / no candidate → fall back to the body background (gap-logged).
    """
    body_bg = (facts.get("body", {}) or {}).get("backgroundColor", "")
    sections = facts.get("sections", []) or []
    marker_paths = [m.get("path", "") for m in (facts.get("previewShellMarkers", []) or [])
                    if isinstance(m, dict) and m.get("path")]

    def _transparent(bg: str) -> bool:
        b = (bg or "").strip().lower().replace(" ", "")
        return b in ("", "transparent", "rgba(0,0,0,0)")

    def _shell_or_ancestor(path: str) -> bool:
        # path IS a shell marker, or an ANCESTOR of one (its path is a '>'-segment prefix of a marker
        # path) → the dark shell wrapper and the body/html enclosing it are not the theme background.
        return any(path == mp or mp.startswith(path + ">") for mp in marker_paths)

    cands = [s for s in sections
             if (s.get("hasParagraph") or s.get("hasHeading")) and not s.get("inChrome")
             and not _transparent(s.get("backgroundColor", ""))]
    if marker_paths:
        cands = [s for s in cands if not _shell_or_ancestor(s.get("path", ""))]
    cands.sort(key=lambda s: -(s.get("area") or 0))

    if cands:
        chosen = cands[0]
        trace.append({"kind": "base", "what": "styles.color.background", "_source": "declared",
                      "reason": f"widest content-containing ancestor '{chosen.get('path','')}' "
                                f"(area {chosen.get('area')}"
                                + (f", {len(marker_paths)} preview-shell marker(s) excluded" if marker_paths else "")
                                + ")",
                      "value": chosen.get("backgroundColor", "")})
        return chosen.get("backgroundColor", body_bg)
    trace.append({"kind": "gap", "what": "styles.color.background",
                  "reason": "no content-containing background candidate — fell back to body background",
                  "value": body_bg})
    return body_bg


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
    print(f"  _sgsExtractor.draft_css_sha256={snap['_sgsExtractor']['draft_css_sha256'][:12]}… "
          f"(FR-33-12 freshness key embedded in the snapshot)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
