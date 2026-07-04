"""entry.py — Stage 4 pipeline entry point for the modular converter (`converter/`).

Moved here from ``orchestrator/converter_v2/__init__.py`` in EXECUTION Step 10
(Phase 4, 2026-07-04): ``convert_section`` (+ its ``SGS_NEW_ENGINE`` fork body,
``_convert_section_body``) and the per-run seed helpers (``reset_pipeline_seed``,
``seed_theme_json``, ``seed_gap_context``, ``ensure_root_section_class``, and the
private ``seed_pipeline_context`` helper convert_section calls internally) — this
IS the canonical implementation now; ``orchestrator/converter_v2/__init__.py``
carries a re-export shim forwarding these five public names for callers not yet
rewired.

Why this file still reaches into the frozen tree
--------------------------------------------------
``convert_section``'s fork tries the modular engine first (``SGS_NEW_ENGINE=1``);
when the section isn't recognised, or the flag is unset entirely, it MUST fall
back to the frozen ``orchestrator.converter_v2.convert.walk()`` — that frozen
walker is still the 100%-live production path (STOP-28: the new engine stays
inert in production until Phase 6 retires the frozen tree). Every frozen-tree
import in this file is lazy (inside the function that needs it) and carries a
`` # STOP-28 fallback — dies at Step 16`` marker comment; ``converter/gates/
import_ban.py`` carries ONE narrow, comment-gated exemption for exactly this
file + marker (see that gate's docstring / ``_STOP28_EXEMPT_FILE`` for the
mechanism) — no other file under ``converter/`` may import the frozen tree.

See ``.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`` for the walker
architecture and ``.claude/plans/2026-07-04-new-engine-to-parity-delete-
converter-v2.md`` for the Phase-4→6 migration plan this file is part of.
"""
from __future__ import annotations

__all__ = [
    "convert_section",
    "ensure_root_section_class",
    "seed_gap_context",
    "seed_theme_json",
    "reset_pipeline_seed",
]

# Module-level pipeline-seed state. The orchestrator calls `convert_section`
# once per boundary; the universal width-mode lift machinery (Branch B,
# 2026-05-19) needs `_LIFT_CONTEXT["theme_widths"]` populated ONCE per
# pipeline run (theme.json + variation overlay + idempotent variation-write).
# This dict gates the seed so subsequent per-section calls no-op cheaply.
_PIPELINE_SEEDED: dict = {"client_slug": None}


def seed_pipeline_context(css_rules: dict, client_slug: str, repo_root) -> dict:
    """Seed `convert._LIFT_CONTEXT` once per pipeline run.

    Universal: detects mockup layout widths from the CSS rule set, writes any
    detected widths into the active style variation (idempotent — never
    overwrites operator-tuned values), then loads the effective theme widths
    (variation override > theme.json default) into ``_LIFT_CONTEXT`` so
    ``_lift_root_supports_to_style`` can emit semantic ``widthMode`` values
    instead of literal-pixel ``style.dimensions.maxWidth``.

    Idempotent: subsequent calls with the same ``client_slug`` no-op and return
    the already-seeded ``theme_widths`` dict.

    Parameters
    ----------
    css_rules:
        Output of ``convert.parse_css(css_text)`` — flat ``{selector: {prop:
        value}}`` dict scanned for ``.sgs-<block>`` root selectors carrying
        ``max-width`` declarations.
    client_slug:
        Active client slug (e.g. ``"mamas-munches"``). When empty / falsy, the
        variation-overlay step is skipped and theme.json defaults stand alone.
    repo_root:
        ``pathlib.Path`` pointing at the repository root. Supplied by the
        caller — never inferred from ``__file__`` here, because the depth
        assumption is fragile across worktrees.

    Returns the seeded ``theme_widths`` dict (``{contentSize, wideSize}`` or
    empty when no widths could be resolved).
    """
    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16
    if _PIPELINE_SEEDED["client_slug"] == client_slug:
        return v3._LIFT_CONTEXT.get("theme_widths") or {}
    detected = v3._detect_client_layout_widths(css_rules)
    if detected and client_slug:
        v3._write_client_layout_widths(client_slug, detected, repo_root)
    widths = v3._load_theme_widths(client_slug or None, repo_root)
    v3._LIFT_CONTEXT["theme_widths"] = widths
    _PIPELINE_SEEDED["client_slug"] = client_slug
    return widths


def reset_pipeline_seed() -> None:
    """Reset pipeline-seed state at the start of a fresh pipeline run.

    Call this from the orchestrator BEFORE the per-section loop fires so
    back-to-back runs in the same process (multi-client batch mode, test
    runners) don't carry stale ``theme_widths`` across clients.
    """
    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16
    _PIPELINE_SEEDED["client_slug"] = None
    v3._LIFT_CONTEXT.pop("theme_widths", None)
    v3._LIFT_CONTEXT.pop("theme_json", None)


def seed_gap_context(run_id: str) -> None:
    """Set the pipeline run_id for D3 gap candidate provenance.

    Call this from the orchestrator once per pipeline run (before the
    per-section loop) so every gap row written during this run carries the
    correct ``source_run_id``.  Proxies to ``convert.seed_gap_context()``.
    """
    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16
    v3.seed_gap_context(run_id)


def seed_theme_json(theme_json: dict) -> None:
    """Store the orchestrator's merged theme.json in _LIFT_CONTEXT for token-snap.

    Called once per pipeline run (before the per-section loop) so
    ``_snap_style_dict_leaves`` inside convert.py has access to the palette /
    spacing / font-size registries without threading theme_json through every
    function call.

    Idempotent — subsequent calls update the in-memory dict in-place so
    cross-session reuse (test runners) always sees the freshest registry.
    """
    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16
    v3._LIFT_CONTEXT["theme_json"] = theme_json if isinstance(theme_json, dict) else {}


def ensure_root_section_class(block_markup: str, section_id: str) -> str:
    """Public proxy to ``convert.ensure_root_section_class``.

    Guarantees the first WP block in *block_markup* carries
    ``sgs-{section_id}`` in its ``className`` attribute.  Idempotent.
    See ``convert.ensure_root_section_class`` for full documentation.
    """
    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16
    return v3.ensure_root_section_class(block_markup, section_id)


def convert_section(html: str, css: str, media_map: dict,
                    client_slug: str = "", repo_root=None,
                    trace=None, boundary_id: str = "",
                    section_id: str = "") -> dict:
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
    client_slug:
        Active client slug (e.g. ``"mamas-munches"``). When non-empty AND
        ``repo_root`` is supplied, the universal width-mode pipeline seed
        fires on the first per-section call of the run and populates
        ``convert._LIFT_CONTEXT["theme_widths"]`` so the lift step can emit
        semantic ``widthMode`` values rather than literal-pixel maxWidth.
        Empty / missing → seed skipped, legacy inline-style fallback stands.
    repo_root:
        ``pathlib.Path`` pointing at the repository root (where ``theme/``
        and ``plugins/`` live). Required for the width-mode seed; ignored
        when ``client_slug`` is empty. Supplied explicitly by the caller —
        never inferred from ``__file__`` here, because the depth assumption
        is fragile across worktrees.
    trace:
        Optional Trace instance (orchestrator.trace.Trace) bound to a per-
        section file (typically ``Trace.for_boundary(run_dir, boundary_id)``).
        When supplied, walker_branch_taken / attr_skipped / db_lookup_miss
        events are emitted. When None, all emission is no-op.
    boundary_id:
        Section identifier tagged onto every emitted trace event so cross-file
        diffs stay coherent. Defaults to ''.
    section_id:
        Stage-3 canonical section identifier (e.g. ``"featured-product"``,
        ``"social-proof"``). When non-empty, the post-emission universal
        className guarantee step ensures the root block's ``className``
        attribute carries ``sgs-{section_id}`` regardless of which converter
        branch produced the markup. Idempotent — safe to pass even when the
        class is already present. Defaults to '' (no guarantee step).
    """
    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16

    # Universal width-mode seed (Branch B, 2026-05-19). Fires once per
    # pipeline run thanks to `seed_pipeline_context`'s idempotent guard;
    # subsequent per-section calls during the same run no-op cheaply.
    # Backwards-compat: when client_slug is empty / repo_root is None,
    # the seed is skipped entirely and the legacy fallback path stands.
    if client_slug and repo_root is not None:
        css_rules_seed = v3.parse_css(css) if css else {}
        seed_pipeline_context(css_rules_seed, client_slug, repo_root)

    # Bind the trace before walk() runs so all walker decisions, attribute
    # skips, and DB lookup misses for this section route to the right file.
    # Soft-reset to None in the finally block at function exit so subsequent
    # sections don't inherit, and an exception between calls leaves no stale
    # binding. Future parallel/threaded dispatch will need a per-thread Trace
    # rather than this module-level singleton — see convert.py:_TRACE.
    # (Sonnet QC finding 2026-05-17.)
    v3.set_trace(trace, boundary_id)
    try:
        return _convert_section_body(html, css, media_map, section_id=section_id)
    finally:
        v3.set_trace(None, "")


def _convert_section_body(html: str, css: str, media_map: dict,
                          section_id: str = "") -> dict:
    """Implementation body for convert_section (trace-lifetime separated).

    Kept as a private helper purely so convert_section can wrap the trace
    binding in try/finally cleanly. All behaviour is unchanged from the
    pre-2026-05-17 inline body except for the universal section-class
    guarantee step (2026-05-21): after walk() produces block_markup,
    ensure_root_section_class() is called with the Stage-3 section_id so
    every section root block carries sgs-{section_id} in its className,
    regardless of which converter branch emitted it.
    """
    from bs4 import BeautifulSoup
    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16

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

    # D3: reset accumulator at the start of each section so gaps from a previous
    # section don't bleed into this one's result dict.
    v3.clear_gap_candidates()

    # Stage 4.5 — reset token-resolution accumulator for this section.
    v3.clear_token_resolutions()

    # P2.iii — reset essence-match event accumulator for this section.
    v3.clear_essence_matches()

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
            "token_resolutions": [],
            "essence_matches": [],
        }

    # CHROME-SKIP (new-engine path). A header/footer/nav top-level element is a
    # template PART (chrome), never page content — it must NOT be cloned into the
    # page (FR-31-3 exception 2 / SKIP_TOP_LEVEL_TAGS, the one permitted constant).
    # The container-default (recognise_section) would otherwise wrap it in an
    # sgs/container and emit it as a section (Bean review 2026-07-01, defect #2).
    # Gated to SGS_NEW_ENGINE=1 so the frozen production path is unchanged (STOP-28).
    import os as _os_chrome
    if _os_chrome.environ.get("SGS_NEW_ENGINE") == "1" and root.name in v3.SKIP_TOP_LEVEL_TAGS:
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
    # No-op when section root is a registered SGS composite (FR1 handles those).
    # Full rule + trace events in convert.py:_absorb_transparent_wrappers docstring.
    v3._absorb_transparent_wrappers(root, css_rules)

    # NEW-ENGINE HYBRID (SGS_NEW_ENGINE=1) — wired for canary testing 2026-06-30
    # (Bean: "wire the new pipeline to /sgs-clone so we can test it in a real
    # situation"). Per section: try the modular converter/ engine; use its emit
    # when the section RECOGNISES to a registered block and produces non-empty WP
    # markup (currently the composite sections — hero, trust-bar, …), else fall
    # back to the frozen walk() for the not-yet-built container/pattern sections.
    # Default (flag UNSET) is 100% the frozen path — unchanged. The new engine
    # stays inert in production; this opt-in flag is the only way to reach it.
    import os as _os
    block_markup = ""
    if _os.environ.get("SGS_NEW_ENGINE") == "1":
        try:
            # recognise_SECTION (not recognise): a top-level section with no
            # registered composite DEFAULTS to sgs/container + recurse children
            # (FR-31-4), instead of returning unrecognised (which would fall back
            # to frozen walk()). This is the call-site that routes the 7 slug-None
            # sections through the new engine (D-container-default). The recursive
            # recognise() used on descendants is unchanged. entry.py already lives
            # inside the `converter` package, so these are ordinary intra-package
            # imports — no sys.path manipulation needed (unlike the pre-move
            # __init__.py, which had to insert scripts/ onto sys.path first
            # because it lived two directories deeper, under orchestrator/).
            from .recognition import recognise_section as _recognise
            from .services.extraction import build_block_markup as _bbm
            _rec = _recognise(root)
            if _rec.slug and _rec.kind != "unrecognised":
                _new = _bbm(_rec, root, css_rules=css_rules, media_map=media_map or {})
                if _new and "wp:" in _new:
                    block_markup = _new
        except Exception:  # noqa: BLE001 — experimental engine; always fall back to frozen
            block_markup = ""

    if not block_markup:
        block_markup = v3.walk(root, css_rules, variation_buf, depth=0, is_top_level=True) or ""

    # Universal section-wrapper className guarantee (2026-05-21).
    # The Stage-3 section_id (e.g. "featured-product") is the canonical
    # identifier for this boundary. The walk() emitter sets className from
    # the HTML class attribute, which normally matches — but the guarantee
    # step is DB-driven and universal: it fires for every section regardless
    # of which converter branch produced the markup, so the pixel-diff
    # tool's --selector .sgs-{section_id} always finds the root block.
    # Idempotent: no-op when sgs-{section_id} is already present.
    if section_id:
        block_markup = ensure_root_section_class(block_markup, section_id)

    # Resolve section_id: prefer the caller-supplied Stage-3 id; fall back
    # to the HTML element's id attribute for legacy / direct-call compat.
    html_id = root.get("id", "")
    resolved_section_id = section_id or html_id

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
            # Bare attr-name key: first-write-wins so the section-root block's
            # attrs dominate nested descendants. Critical for className — the
            # root block's sgs-<section> class must not be overwritten by an
            # inner sgs/container emitted by A1 layout-container (e.g.
            # sgs-social-proof__trustpilot-bar clobbering sgs-social-proof).
            # The block-short-prefixed form is still written unconditionally so
            # downstream consumers that want block-level disambiguation still
            # get the full series (e.g. container.className for every
            # sgs/container in the tree, last-write-wins by block-short key).
            if k not in extracted:
                extracted[k] = v
            extracted[f"{block_short}.{k}"] = v

    # D3: flush accumulated gap candidates — writes to sgs-framework.db via
    # INSERT OR IGNORE and returns the written rows for the result dict.
    gap_candidates = v3.flush_gap_candidates()

    # Stage 4.5 — flush token resolutions accumulated during walk().
    token_resolutions = v3.flush_token_resolutions()

    # P2.iii — flush essence-match events accumulated during walk().
    essence_matches = v3.flush_essence_matches()

    return {
        "boundary_id": resolved_section_id or selector,
        "section_id": resolved_section_id,
        "selector": selector,
        "block_name": "sgs/container",  # downstream consumers infer the actual block from block_markup
        "status": "complete",
        "extracted_attributes": extracted,
        "block_markup": block_markup,
        "variation_css": "\n".join(variation_buf),
        "attribute_gap_candidates": gap_candidates,
        "token_resolutions": token_resolutions,
        "essence_matches": essence_matches,
    }
