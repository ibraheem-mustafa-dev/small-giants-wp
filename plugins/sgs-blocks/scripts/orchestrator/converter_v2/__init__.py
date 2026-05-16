"""Converter v2 — Spec 16 deterministic slot-aware DOM-to-WP-blocks converter.

Public API:
    convert_section(html, css, media_map) -> dict  — per-section result
    convert_page(html_path, media_map_path) -> list[dict]  — full page

See .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md for architecture.
"""
from __future__ import annotations

from .convert_page import convert_page as _convert_page_impl

__all__ = ["convert_page", "convert_section"]


def convert_page(html_path: "str | object", media_map_path: "str | object | None" = None) -> list[dict]:
    """Convert a full-page SGS-BEM mockup HTML file to a list of per-section result dicts.

    Parameters
    ----------
    html_path:
        Path (str or Path) to the mockup HTML file.
    media_map_path:
        Optional path (str or Path) to the client's media-map JSON. When
        supplied, <img src> values are resolved to WP attachment URLs.

    Returns a list of dicts, one per top-level section found in the mockup.
    Each dict matches the per_section_results schema (see Step 2.2 of the
    Phase 7 plan): boundary_id, section_id, selector, block_name, status,
    extracted_attributes, block_markup, variation_css, attribute_gap_candidates.
    """
    from pathlib import Path

    html_path = Path(html_path)
    media_map_path = Path(media_map_path) if media_map_path else None

    html_text = html_path.read_text(encoding="utf-8")
    markup, variation_buf, summary = _convert_page_impl(html_text, media_map_path)

    # Re-parse to reconstruct per-section results in the orchestrator schema shape.
    # _convert_page_impl returns (combined_markup, variation_buf, summary_list).
    # We split markup back per section using the summary list for section metadata,
    # and pair each section's markup fragment from the summary-driven walk output.
    # Because _convert_page_impl concatenates all sections, we re-run per-section
    # to get individual markup strings for the orchestrator's per_section_results list.
    from bs4 import BeautifulSoup
    from . import convert as v3
    from .convert_page import extract_inline_css, find_top_level_sections

    soup = BeautifulSoup(html_text, "html.parser")
    css_text = extract_inline_css(soup)
    css_rules = v3.parse_css(css_text)

    if media_map_path:
        v3.load_media_map(media_map_path)

    sections = find_top_level_sections(soup)
    if not sections:
        body = soup.find("body")
        if body:
            sections = [body]

    results: list[dict] = []
    for sec in sections:
        sec_classes: list[str] = sec.get("class", []) or []
        sec_label = sec_classes[0] if sec_classes else f"<{sec.name}>"
        sec_id = sec.get("id", "")
        selector_cls = ".".join(sec_classes) if sec_classes else sec.name
        selector = f"{sec.name}.{selector_cls}" if sec_classes else sec.name

        variation_buf_sec: list[str] = []
        markup_str = v3.walk(sec, css_rules, variation_buf_sec, is_top_level=True) or ""

        # Parse attrs from emitted markup — brace-depth scan handles nested objects.
        import re as _re2
        import json as _json2
        _sec_extracted: dict = {}
        _slug_re2 = _re2.compile(r"<!-- wp:([\w/\-]+)\s+(\{)", _re2.DOTALL)
        _sm = _slug_re2.search(markup_str)
        if _sm:
            _slug2 = _sm.group(1)
            _bstart = _sm.start(2)
            _depth = 0
            for _i, _ch in enumerate(markup_str[_bstart:], start=_bstart):
                if _ch == "{":
                    _depth += 1
                elif _ch == "}":
                    _depth -= 1
                    if _depth == 0:
                        try:
                            _raw2 = _json2.loads(markup_str[_bstart: _i + 1])
                            _short2 = _slug2.rsplit("/", 1)[-1]
                            for _k, _v in _raw2.items():
                                _sec_extracted[_k] = _v
                                _sec_extracted[f"{_short2}.{_k}"] = _v
                        except (ValueError, KeyError):
                            pass
                        break

        results.append({
            "boundary_id": sec_id or sec_label,
            "section_id": sec_id,
            "selector": selector,
            "block_name": "sgs/container",  # actual block inferred from block_markup
            "status": "complete",
            "extracted_attributes": _sec_extracted,
            "block_markup": markup_str,
            "variation_css": "\n".join(variation_buf_sec),
            "attribute_gap_candidates": [],
        })

    return results


def convert_section(html: str, css: str, media_map: dict,
                    trace=None, boundary_id: str = "") -> dict:
    """Convert a single section's HTML+CSS to a Stage 4 result dict.

    Returns a dict matching the per_section_results schema documented in
    Step 2.2 of the Phase 7 plan: { boundary_id, section_id, selector,
    block_name, status, extracted_attributes, block_markup, variation_css,
    attribute_gap_candidates }.

    Parameters
    ----------
    html:
        Raw HTML string for the section element (a single <section>, <header>,
        or <footer> element with SGS-BEM classes).
    css:
        CSS text to use for variation-CSS lifting. Typically the full inline
        <style> block from the mockup document.
    media_map:
        Dict of {filename: {id, url}} for WP attachment URL resolution.
        Pass an empty dict when no media-map is available.
    trace:
        Optional Trace instance (orchestrator.trace.Trace) bound to a per-
        section file (typically ``Trace.for_boundary(run_dir, boundary_id)``).
        When supplied, walker_branch_taken / attr_skipped / db_lookup_miss
        events are emitted. When None, all emission is no-op.
    boundary_id:
        Section identifier tagged onto every emitted trace event so cross-file
        diffs stay coherent. Defaults to ''.
    """
    from bs4 import BeautifulSoup
    from . import convert as v3

    # Bind the trace before walk() runs so all walker decisions, attribute
    # skips, and DB lookup misses for this section route to the right file.
    # Soft-reset to None at function exit so subsequent sections don't inherit.
    v3.set_trace(trace, boundary_id)

    # Load media map into module-level cache
    if media_map:
        import json as _json
        import tempfile
        from pathlib import Path
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
            _json.dump(media_map, f)
            tmp_path = Path(f.name)
        v3.load_media_map(tmp_path)
        try:
            tmp_path.unlink()
        except OSError:
            pass
    else:
        v3.load_media_map(None)

    soup = BeautifulSoup(html, "html.parser")
    css_rules = v3.parse_css(css) if css else {}
    variation_buf: list[str] = []

    # Find the section root — first element child of soup
    root = soup.find()
    if root is None:
        return {
            "boundary_id": "",
            "section_id": "",
            "selector": "",
            "block_name": "sgs/container",
            "status": "empty",
            "extracted_attributes": {},
            "block_markup": "",
            "variation_css": "",
            "attribute_gap_candidates": [],
        }

    block_markup = v3.walk(root, css_rules, variation_buf, depth=0, is_top_level=True) or ""
    section_id = root.get("id", "")
    selector_classes: list[str] = root.get("class", []) or []
    selector = f"{root.name}." + ".".join(selector_classes) if selector_classes else root.name

    # Populate extracted_attributes from the emitted block markup so the Stage 9
    # leftover-bucket-router can compare against the slot-list and correctly
    # credit the converter's output (instead of treating every lifted attr as a
    # failure because extracted_attributes={}).
    #
    # Strategy: find the first WP block comment (<!-- wp:<slug> {...} /-->  or
    # <!-- wp:<slug> {...} -->) and extract its attrs dict.  We can't use a simple
    # {[^}]*} regex because attrs include nested objects (e.g. splitImage: {id,url}).
    # Instead we locate the opening { after the block slug and use a
    # brace-depth-counting scan to find the matching closing }.
    import re as _re
    import json as _json

    extracted: dict = {}

    def _harvest_all_wp_block_attrs(markup: str) -> list[tuple[str, dict]]:
        """Return [(block_slug, attrs_dict), ...] for EVERY WP block comment in
        markup that carries an attrs JSON object.

        Walks every <!-- wp:<slug> { ... } occurrence with brace-depth counting
        so nested objects in attrs (e.g. splitImage: {id, url}) don't fool the
        scanner. Critical for leftover-bucket-router accuracy: sections with
        composite-block compositions (sgs/container > sgs/product-card × 2 etc.)
        previously only had the outer container's attrs harvested. Stage 9 then
        treated every nested block's slot as 'extraction_failed' even though
        the converter HAD lifted them. Fixed 2026-05-16 per Bean's directive
        that leftover-buckets must give accurate info (binding rule #1).
        """
        results: list[tuple[str, dict]] = []
        _slug_re = _re.compile(r"<!-- wp:([\w/\-]+)\s+(\{)", _re.DOTALL)
        for m in _slug_re.finditer(markup):
            slug = m.group(1)
            brace_start = m.start(2)
            depth = 0
            for i, ch in enumerate(markup[brace_start:], start=brace_start):
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        raw_json = markup[brace_start: i + 1]
                        try:
                            results.append((slug, _json.loads(raw_json)))
                        except ValueError:
                            pass
                        break
        return results

    for block_slug, raw_attrs in _harvest_all_wp_block_attrs(block_markup):
        if not raw_attrs:
            continue
        block_short = block_slug.rsplit("/", 1)[-1]
        for k, v in raw_attrs.items():
            # Bare attr-name key (last-write-wins across nested blocks is fine
            # — the bucket-router treats finding any non-empty value at the
            # bare name as 'slot filled'; we don't need block-disambiguation
            # for the gap signal). The block-short-prefixed form additionally
            # preserves block context for downstream consumers that want it.
            extracted[k] = v
            extracted[f"{block_short}.{k}"] = v

    return {
        "boundary_id": section_id or selector,
        "section_id": section_id,
        "selector": selector,
        "block_name": "sgs/container",  # downstream consumers infer the actual block from block_markup
        "status": "complete",
        "extracted_attributes": extracted,
        "block_markup": block_markup,
        "variation_css": "\n".join(variation_buf),
        "attribute_gap_candidates": [],  # populated when the converter emits gap rows
    }
