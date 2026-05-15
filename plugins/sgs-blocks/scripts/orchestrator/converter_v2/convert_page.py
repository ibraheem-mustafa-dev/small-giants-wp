#!/usr/bin/env python3
"""convert_page.py — full-page deterministic converter.

Phase B-minimal wiring: takes a Bean-controlled SGS-BEM mockup (single HTML
file with embedded <style> + media references), splits it into top-level
sections, calls the v3 single-section converter per section, and produces a
single block-markup file that could be pasted into a WP post / template.

Does NOT touch sgs-clone-orchestrator.py. Side-by-side comparable with the
existing /sgs-clone pipeline's output for A/B evaluation.

Usage:
    python convert_page.py <full-mockup.html> [media-map.json] [--out output.html]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Tag

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Package-relative import (production path). Falls back to same-dir import when
# executed directly as a script (e.g. during CLI smoke tests).
try:
    from . import convert as v3  # noqa: E402
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    import convert as v3  # type: ignore[no-redef]  # noqa: E402


def extract_inline_css(soup: BeautifulSoup) -> str:
    """Concatenate every <style> block in the document.

    Drafts often have one big <style> block in <head>; some have multiple. We
    take them all so the parser builds a complete {selector: declarations} map.
    """
    chunks: list[str] = []
    for tag in soup.find_all("style"):
        chunks.append(tag.get_text())
    return "\n\n".join(chunks)


def find_top_level_sections(soup: BeautifulSoup) -> list[Tag]:
    """Return every top-level section-like element in the body.

    Strategy:
      1. Look for <header>, <section>, <footer> elements
      2. Filter to those whose first sgs-* class has NO __ separator
         (i.e. a bare block class like 'sgs-hero', not an element class
         like 'sgs-header__nav')
      3. Then dedupe: drop any candidate that's a descendant of another
         candidate (handles cases where a wrapper <main> got matched but
         a child <section> also did — keep only the outermost addressable
         unit per branch)
    """
    body = soup.find("body") or soup
    candidates: list[Tag] = []
    for tag_name in ("header", "section", "footer"):
        for el in body.find_all(tag_name):
            classes = el.get("class", []) or []
            # First sgs-* class must be a bare block class (no __ element part)
            sgs_classes = [c for c in classes if c.startswith("sgs-")]
            if not sgs_classes:
                continue
            if "__" in sgs_classes[0]:
                continue
            candidates.append(el)
    # Drop candidates that are descendants of other candidates
    cand_ids = {id(c) for c in candidates}
    out: list[Tag] = []
    for c in candidates:
        if any(id(anc) in cand_ids for anc in c.parents):
            continue
        out.append(c)
    return out


def convert_page(html_text: str, media_map_path: Path | None) -> tuple[str, list[str], list[dict]]:
    """Convert a full-page mockup into combined block markup + variation CSS.

    Returns:
        (block_markup, variation_css_lines, per_section_summary)
    """
    soup = BeautifulSoup(html_text, "html.parser")
    css_text = extract_inline_css(soup)
    css_rules = v3.parse_css(css_text)

    if media_map_path:
        v3.load_media_map(media_map_path)

    sections = find_top_level_sections(soup)
    if not sections:
        # No section tags — convert the whole body as one block
        body = soup.find("body")
        if body:
            sections = [body]

    block_markup_parts: list[str] = []
    variation_buf: list[str] = []
    summary: list[dict] = []

    for sec in sections:
        sec_classes = sec.get("class", []) or []
        sec_label = (sec_classes[0] if sec_classes else f"<{sec.name}>")
        # is_top_level=True so unmatched section wrappers DO emit sgs/container.
        # Nested wrappers inside (passed through recursive walk) get is_top_level=False
        # and pass through without container wrapping.
        markup = v3.walk(sec, css_rules, variation_buf, is_top_level=True)
        if markup:
            block_markup_parts.append(markup)
            # Quick summary: section class, block count emitted, line count
            line_count = markup.count("\n") + 1
            summary.append({
                "section": sec_label,
                "tag": sec.name,
                "lines_emitted": line_count,
                "first_block": markup.split("\n", 1)[0][:80],
            })

    return ("\n\n".join(block_markup_parts), variation_buf, summary)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mockup", nargs="?", default=None,
                        help="Path to the full mockup HTML file (positional; required unless --mode pipeline)")
    parser.add_argument("media_map", nargs="?", default=None,
                        help="Optional path to client media-map JSON")
    parser.add_argument("--out", default=None,
                        help="Write block markup to this file (default: stdout)")
    parser.add_argument("--variation-css-out", default=None,
                        help="Write variation CSS to this file")
    parser.add_argument("--summary-only", action="store_true",
                        help="Print only the per-section summary, no markup")
    # Step 2.2 pipeline mode — invoked by the orchestrator as a subprocess fallback
    # when direct package import is unavailable. Converts a single section.
    parser.add_argument("--mode", default=None, choices=("pipeline",),
                        help="'pipeline' reads --section-html + --section-css + --media-map "
                             "and writes a per_section_results JSON to --out.")
    parser.add_argument("--section-html", default=None,
                        help="[pipeline mode] Path to section HTML fragment file")
    parser.add_argument("--section-css", default=None,
                        help="[pipeline mode] Path to section CSS file")
    args = parser.parse_args(argv[1:])

    # Step 2.2 — pipeline mode: single-section conversion, result written to --out as JSON
    if args.mode == "pipeline":
        import json as _json
        if not args.section_html or not args.out:
            print("ERROR: --mode pipeline requires --section-html and --out", file=sys.stderr)
            return 2
        try:
            from . import convert as v3
        except ImportError:
            sys.path.insert(0, str(Path(__file__).parent))
            import convert as v3  # type: ignore[no-redef]
        section_html = Path(args.section_html).read_text(encoding="utf-8")
        section_css = Path(args.section_css).read_text(encoding="utf-8") if args.section_css else ""
        media_map_obj: dict = {}
        if args.media_map and Path(args.media_map).exists():
            media_map_obj = _json.loads(Path(args.media_map).read_text(encoding="utf-8"))
        if media_map_obj:
            import tempfile
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
                _json.dump(media_map_obj, f)
                _tmp = Path(f.name)
            v3.load_media_map(_tmp)
            try:
                _tmp.unlink()
            except OSError:
                pass
        else:
            v3.load_media_map(None)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(section_html, "html.parser")
        css_rules = v3.parse_css(section_css) if section_css else {}
        variation_buf: list[str] = []
        root = soup.find()
        if root is None:
            result = {"boundary_id": "", "section_id": "", "selector": "", "block_name": "sgs/container",
                      "status": "empty", "extracted_attributes": {}, "block_markup": "",
                      "variation_css": "", "attribute_gap_candidates": []}
        else:
            block_markup = v3.walk(root, css_rules, variation_buf, depth=0, is_top_level=True) or ""
            section_id = root.get("id", "")
            selector_classes: list[str] = root.get("class", []) or []
            selector = f"{root.name}." + ".".join(selector_classes) if selector_classes else root.name
            result = {
                "boundary_id": section_id or selector,
                "section_id": section_id,
                "selector": selector,
                "block_name": "sgs/container",
                "status": "complete",
                "extracted_attributes": {},
                "block_markup": block_markup,
                "variation_css": "\n".join(variation_buf),
                "attribute_gap_candidates": [],
            }
        Path(args.out).write_text(_json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        return 0

    if not args.mockup:
        print("ERROR: positional argument 'mockup' is required (or use --mode pipeline)", file=sys.stderr)
        return 2
    mockup_path = Path(args.mockup)
    if not mockup_path.exists():
        print(f"ERROR: mockup not found: {mockup_path}", file=sys.stderr)
        return 1

    media_map_path = Path(args.media_map) if args.media_map else None
    html_text = mockup_path.read_text(encoding="utf-8")
    markup, variation_buf, summary = convert_page(html_text, media_map_path)

    # Per-section summary
    print("=" * 60, file=sys.stderr)
    print("PER-SECTION SUMMARY", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    for row in summary:
        print(f"  {row['section']:45} ({row['tag']:8}) lines={row['lines_emitted']:4}", file=sys.stderr)
    print(f"\nTotal sections converted: {len(summary)}", file=sys.stderr)
    print(f"Total markup lines: {markup.count(chr(10)) + 1}", file=sys.stderr)
    print(f"Variation CSS rules collected: {len(variation_buf)}", file=sys.stderr)

    if args.summary_only:
        return 0

    if args.out:
        Path(args.out).write_text(markup, encoding="utf-8")
        print(f"\nBlock markup → {args.out}", file=sys.stderr)
    else:
        print()
        print(markup)

    if args.variation_css_out and variation_buf:
        Path(args.variation_css_out).write_text("\n".join(variation_buf), encoding="utf-8")
        print(f"Variation CSS → {args.variation_css_out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
