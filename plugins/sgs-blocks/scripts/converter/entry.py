"""entry.py — Stage 4 pipeline entry point for the modular converter (`converter/`).

Moved here from ``orchestrator/converter_v2/__init__.py`` in EXECUTION Step 10
(Phase 4, 2026-07-04): ``convert_section`` (+ its per-run seed helpers) — this
IS the canonical implementation.

FLIPPED (EXECUTION Step 16, Phase 6, 2026-07-05): the ``SGS_NEW_ENGINE`` env
gate is gone and the frozen ``orchestrator.converter_v2.convert.walk()``
fallback is DELETED. The modular engine (``converter.recognition`` +
``converter.services.assembly.build_block_markup``) is now the ONLY
converter. See ``.claude/plans/2026-07-04-new-engine-to-parity-delete-
converter-v2.md`` for the Phase-4→6 migration plan this file closes out.

New failure contract (Rule 4 — raise/report loud, never silent-empty):
when a section's root node doesn't recognise to a registered block, or
``build_block_markup`` returns empty / non-``wp:`` markup, or raises, this
module returns a result dict with ``status: 'failed'`` + a ``failure_reason``
string and logs at ERROR. It never silently falls back and never returns an
empty ``status: 'complete'``.

Dead plumbing removed as part of the flip (each verified against the new
engine before deletion — see the Step-16 execution summary for the tracing
evidence):

  - ``client_slug``/``repo_root`` width-mode seed (``_LIFT_CONTEXT
    ["theme_widths"]``) — the new engine never reads ``_LIFT_CONTEXT``
    (`widthMode` was retired D230/D231 in favour of align-based full-bleed).
    ``reset_pipeline_seed``/``seed_theme_json`` stay as documented no-ops
    (signatures preserved) because ``sgs-clone-orchestrator.py`` still calls
    them.
  - The D3 attribute-gap-candidate accumulator (``clear_gap_candidates``/
    ``flush_gap_candidates``) — traced to ``sgs-clone-orchestrator.py``: the
    per-section ``attribute_gap_candidates`` field this module returned was
    written into ``per_section_results`` but never read back by anything
    downstream (the real gap-candidate harvest at
    ``_harvest_attribute_gap_candidates`` reads ``token_resolutions``, a
    wholly separate channel). The new engine's own GAP objects
    (``converter.services.gap_writer.gap_writer`` → ``GAP`` dataclass) flow
    through ``build_block_markup``'s internal extraction results into the
    Stage-3 conservation ledger (``ledger/content_gap_check.py`` vs
    ``content-gap-baseline.json``), NOT into the ``attribute_gap_candidates``
    DB table. ``seed_gap_context`` stays a documented no-op (signature
    preserved; the run_id it seeded had no consumer left once the
    accumulator died).
  - Token-resolution / essence-match accumulators
    (``clear/flush_token_resolutions``, ``clear/flush_essence_matches``) —
    frozen-only instrumentation with zero new-engine producer (grepped
    ``converter/services/token_snap.py`` — no token-resolution recording).
    This module now returns ``[]`` for both result keys unconditionally.
  - ``load_media_map`` — the new engine threads ``media_map`` explicitly as a
    plain dict through ``build_block_markup(..., media_map=media_map)``; the
    frozen module-level media-map cache has no reader left.
  - The trace binding — the frozen ``v3.set_trace``/``_TRACE`` global was
    consumed ONLY by frozen ``walk()``. The new engine's own injectable trace
    point is ``converter.services.section_passes.set_trace_fn`` (previously
    unwired despite its docstring claiming otherwise — wired here as part of
    this flip so section-pass trace events actually reach the bound Trace).
"""
from __future__ import annotations

import logging

__all__ = [
    "convert_section",
    "ensure_root_section_class",
    "seed_gap_context",
    "seed_theme_json",
    "reset_pipeline_seed",
]

_LOG = logging.getLogger(__name__)


def reset_pipeline_seed() -> None:
    """No-op (EXECUTION Step 16). Signature preserved for
    ``sgs-clone-orchestrator.py`` callers.

    The frozen consumer this seeded (``convert._LIFT_CONTEXT["theme_widths"]``
    / ``["theme_json"]``, read only by the now-deleted ``walk()``) died at
    Step 16. The new engine never reads ``_LIFT_CONTEXT``.
    """


def seed_gap_context(run_id: str) -> None:  # noqa: ARG001
    """No-op (EXECUTION Step 16). Signature preserved for
    ``sgs-clone-orchestrator.py`` callers.

    Seeded ``run_id`` provenance for the frozen D3 attribute-gap-candidate
    accumulator, which had no live downstream reader (see module docstring)
    and was removed at Step 16.
    """


def seed_theme_json(theme_json: dict) -> None:  # noqa: ARG001
    """No-op (EXECUTION Step 16). Signature preserved for
    ``sgs-clone-orchestrator.py`` callers.

    Seeded ``convert._LIFT_CONTEXT["theme_json"]`` for the frozen token-snap
    lift path (``_snap_style_dict_leaves`` in the now-deleted convert.py).
    The new engine's token-snap service (``converter.services.token_snap``)
    does not consume ``_LIFT_CONTEXT``.
    """


def ensure_root_section_class(block_markup: str, section_id: str) -> str:
    """Guarantees the first WP block in *block_markup* carries
    ``sgs-{section_id}`` in its ``className`` attribute. Idempotent.

    PORTED (EXECUTION Step 14): the implementation lives in
    ``converter.services.section_passes`` (a faithful byte-copy of the frozen
    original, equivalence-smoked).
    """
    from converter.services.section_passes import ensure_root_section_class as _impl
    return _impl(block_markup, section_id)


def _bind_trace(trace, boundary_id: str):
    """Build an injectable trace callable bound to *trace* + *boundary_id*.

    Mirrors the frozen ``convert._trace`` soft-fail shape (never raises out
    of a trace call) but wires into ``converter.services.section_passes``'s
    own injectable point instead of a frozen module-level global.
    """
    if trace is None:
        return None

    def _emit(stage: str, **kwargs) -> None:
        try:
            kwargs.setdefault("boundary_id", boundary_id)
            trace.event(stage=stage, **kwargs)
        except Exception:  # noqa: BLE001 — trace emission must never break conversion
            pass

    return _emit


def convert_section(html: str, css: str, media_map: dict,
                    client_slug: str = "", repo_root=None,
                    trace=None, boundary_id: str = "",
                    section_id: str = "") -> dict:
    """Convert a single section's HTML+CSS to a Stage 4 result dict.

    Returns a dict matching the per_section_results schema: { boundary_id,
    section_id, selector, block_name, status, extracted_attributes,
    block_markup, variation_css, attribute_gap_candidates, token_resolutions,
    essence_matches }. ``status`` is one of ``empty`` (no root element),
    ``chrome-skipped`` (header/footer/nav top-level chrome), ``complete``, or
    ``failed`` (recognition/emit failure — carries ``failure_reason``).

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
    client_slug, repo_root:
        Accepted for call-site compatibility (``sgs-clone-orchestrator.py``
        still passes them). No longer consumed — see module docstring
        (width-mode seed removed at Step 16).
    trace:
        Optional Trace instance (orchestrator.trace.Trace). When supplied,
        section-pass events (absorb / className-guarantee) route to it via
        ``converter.services.section_passes.set_trace_fn``. None → no-op.
    boundary_id:
        Section identifier tagged onto every emitted trace event.
    section_id:
        Stage-3 canonical section identifier (e.g. ``"featured-product"``,
        ``"social-proof"``). When non-empty, the post-emission universal
        className guarantee step ensures the root block's ``className``
        attribute carries ``sgs-{section_id}``. Idempotent.
    """
    from converter.services.section_passes import set_trace_fn
    from converter.services.styling_helpers import configure_colour_resolution_from_run

    # Build (once per run, memoised) the draft `:root` colour map + the client's
    # theme palette map so draft `var(--X)` colours snap to the correct theme
    # token (P-DRAFT-CSSVAR). Inert when no client/theme-snapshot is available.
    configure_colour_resolution_from_run(css, client_slug, repo_root)

    set_trace_fn(_bind_trace(trace, boundary_id))
    try:
        return _convert_section_body(html, css, media_map, section_id=section_id)
    finally:
        set_trace_fn(None)


def _convert_section_body(html: str, css: str, media_map: dict,
                          section_id: str = "") -> dict:
    """Implementation body for convert_section (trace-lifetime separated).

    EXECUTION Step 16: the SGS_NEW_ENGINE fork is gone — the modular engine
    (recognise_section + build_block_markup) is the only path. Any
    unrecognised section or empty/erroring emit returns status='failed' with
    a failure_reason (Rule 4 — loud, never silent-empty).
    """
    from bs4 import BeautifulSoup

    from converter.services.css_parse import parse_css
    from converter.services.section_passes import SKIP_TOP_LEVEL_TAGS, _absorb_transparent_wrappers

    soup = BeautifulSoup(html, "html.parser")
    css_rules = parse_css(css) if css else {}

    empty_result = {
        "boundary_id": "",
        "section_id": "",
        "selector": "",
        "block_name": "sgs/container",
        "status": "empty",
        "extracted_attributes": {},
        "block_markup": "",
        "variation_css": "",
        "attribute_gap_candidates": [],
        "token_resolutions": [],
        "essence_matches": [],
    }

    # Find the section root — first element child of soup
    root = soup.find()
    if root is None:
        return empty_result

    # CHROME-SKIP. A header/footer/nav top-level element is a template PART
    # (chrome), never page content — it must NOT be cloned into the page
    # (FR-31-3 exception 2 / SKIP_TOP_LEVEL_TAGS, the one permitted constant).
    # Unconditional now (the SGS_NEW_ENGINE gate that used to guard this died
    # at Step 16).
    if root.name in SKIP_TOP_LEVEL_TAGS:
        return {
            "boundary_id": section_id or root.name,
            "section_id": section_id,
            "selector": root.name,
            "block_name": "",
            "status": "chrome-skipped",
            "extracted_attributes": {},
            "block_markup": "",
            "variation_css": "",
            "attribute_gap_candidates": [],
            "token_resolutions": [],
            "essence_matches": [],
        }

    # Transparent-wrapper absorb pre-pass (2026-05-24).
    # When a section has exactly one direct element child that's a transparent
    # wrapper (BEM-named, no internal block-spacing or positioning, not a
    # registered composite block), absorb its className into the section root
    # so the walker emits ONE sgs/container instead of two nested ones.
    _absorb_transparent_wrappers(root, css_rules)

    html_id = root.get("id", "")
    resolved_section_id = section_id or html_id
    selector_classes: list[str] = root.get("class", []) or []
    selector = f"{root.name}." + ".".join(selector_classes) if selector_classes else root.name

    from .recognition import recognise_section
    from .services.assembly import build_block_markup

    block_markup = ""
    failure_reason = ""
    try:
        rec = recognise_section(root)
        if not rec.slug or rec.kind == "unrecognised":
            failure_reason = f"recognise_section returned unrecognised (kind={rec.kind!r})"
        else:
            block_markup = build_block_markup(rec, root, css_rules=css_rules, media_map=media_map or {})
            if not block_markup or "wp:" not in block_markup:
                failure_reason = "build_block_markup returned empty/non-wp: markup"
    except Exception as exc:  # noqa: BLE001 — caught to attach failure_reason, re-raised as failed status (Rule 4: never silent)
        block_markup = ""
        failure_reason = f"{type(exc).__name__}: {exc}"
        _LOG.error(
            "convert_section failed for boundary_id=%s section_id=%s selector=%s: %s",
            resolved_section_id, resolved_section_id, selector, failure_reason,
        )

    if failure_reason:
        _LOG.error(
            "convert_section: %s (boundary_id=%s selector=%s)",
            failure_reason, resolved_section_id, selector,
        )
        return {
            "boundary_id": resolved_section_id or selector,
            "section_id": resolved_section_id,
            "selector": selector,
            "block_name": "sgs/container",
            "status": "failed",
            "failure_reason": failure_reason,
            "extracted_attributes": {},
            "block_markup": "",
            "variation_css": "",
            "attribute_gap_candidates": [],
            "token_resolutions": [],
            "essence_matches": [],
        }

    # Universal section-wrapper className guarantee (2026-05-21).
    # The Stage-3 section_id (e.g. "featured-product") is the canonical
    # identifier for this boundary. Idempotent: no-op when sgs-{section_id}
    # is already present.
    if section_id:
        block_markup = ensure_root_section_class(block_markup, section_id)

    # Populate extracted_attributes from the emitted block markup so the Stage 9
    # leftover-bucket-router can compare against the slot-list and correctly
    # credit the converter's output (instead of treating every lifted attr as a
    # failure because extracted_attributes={}).
    #
    # Strategy: find every WP block comment (<!-- wp:<slug> {...} /--> or
    # <!-- wp:<slug> {...} -->) and extract its attrs dict via brace-depth
    # counting (attrs include nested objects, e.g. splitImage: {id, url}).
    import re as _re
    import json as _json

    extracted: dict = {}

    def _harvest_all_wp_block_attrs(markup: str) -> list[tuple[str, dict]]:
        """Return [(block_slug, attrs_dict), ...] for EVERY WP block comment in
        markup that carries an attrs JSON object.
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
            # Bare attr-name key: first-write-wins so the section-root block's
            # attrs dominate nested descendants (e.g. className).
            if k not in extracted:
                extracted[k] = v
            extracted[f"{block_short}.{k}"] = v

    return {
        "boundary_id": resolved_section_id or selector,
        "section_id": resolved_section_id,
        "selector": selector,
        "block_name": "sgs/container",  # downstream consumers infer the actual block from block_markup
        "status": "complete",
        "extracted_attributes": extracted,
        "block_markup": block_markup,
        "variation_css": "",
        # Dead channels (no new-engine producer) — see module docstring.
        "attribute_gap_candidates": [],
        "token_resolutions": [],
        "essence_matches": [],
    }
