"""Converter v2 — Spec 16 deterministic slot-aware DOM-to-WP-blocks converter.

Public API:
    convert_section(html, css, media_map) -> dict  — per-section result
    convert_page(html_path, media_map_path) -> list[dict]  — full page

See .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md for architecture.

RE-EXPORT SHIM (EXECUTION Step 10, Phase 4, 2026-07-04): ``convert_section``
(+ its ``_convert_section_body`` fork) and the seed helpers
(``reset_pipeline_seed``, ``seed_theme_json``, ``seed_gap_context``,
``ensure_root_section_class``, ``seed_pipeline_context``) moved to
``converter/entry.py`` — that IS the canonical implementation now. This
package still owns the frozen ``convert.py`` engine + the legacy full-page
``convert_page`` entry point (unmoved — no Stage-4 consumer needs it) +
``flush_essence_matches`` (a separate proxy, unrelated to the entry-symbol
move). The five entry symbols below are forwarded from ``converter.entry`` so
callers not yet rewired to the new import path keep working.
"""
from __future__ import annotations

import sys
from pathlib import Path

from .convert_page import convert_page as _convert_page_impl

# sys.path guard: converter.entry lives at scripts/converter/entry.py; this
# package (orchestrator/converter_v2/__init__.py) is two directories deeper
# than scripts/, so scripts/ must be discoverable before the absolute
# `converter.entry` import below resolves. Cheap + idempotent — mirrors the
# guard in the Step-9 db_lookup.py shim.
_SCRIPTS_ROOT = Path(__file__).resolve().parents[2]  # .../sgs-blocks/scripts
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.entry import (  # noqa: F401 — re-export shim
    convert_section,
    ensure_root_section_class,
    seed_gap_context,
    seed_theme_json,
    reset_pipeline_seed,
)
from converter.entry import seed_pipeline_context  # noqa: F401 — private helper, not in __all__ but some callers reach it directly

__all__ = [
    "convert_page",
    "convert_section",
    "ensure_root_section_class",
    "seed_pipeline_context",
    "seed_gap_context",
    "seed_theme_json",
    "reset_pipeline_seed",
    "flush_essence_matches",
]


def flush_essence_matches() -> list[dict]:
    """Return + clear the per-section essence-match log.

    Called by the orchestrator once per section emit to ship the per-section
    essence-match diagnostics into the run's pipeline-state. Proxies to
    ``convert.flush_essence_matches()``. The wrapper exists so callers can
    ``from orchestrator.converter_v2 import flush_essence_matches`` directly —
    earlier sessions advertised this name in ``__all__`` without exporting it,
    producing an ImportError when consumers tried the documented import path
    (caught by /qc-council 2026-05-27, fixed in Phase 1.4b).
    """
    from . import convert as v3
    return v3.flush_essence_matches()


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
        v3._absorb_transparent_wrappers(sec, css_rules)
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
