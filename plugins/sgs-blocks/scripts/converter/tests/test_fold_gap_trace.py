"""The fold/per-area gap channels must be WIRED, not silently no-op.

Spec 31 §3.A step 8: a property with no destination is FLAGGED, never
silent-dropped.

``fold_helpers`` already BUILT these findings (``cross_node_gap_candidate`` /
``reason="no_area_attr"``), but both call sites in ``assembly.py`` omitted the
``trace=`` kwarg, so the finding went to ``_noop_trace`` and evaporated. A
repo-wide grep for ``trace=``/``record_gap=`` against these helpers returned
ZERO call sites — every fold gap in the engine was invisible.

Real cost of the blind spot: the Mama's clone drops the product-card ``__body``
padding entirely, and it LOOKED faithful because the block's own hardcoded
fallback (style.css:81, 20px) happens to equal the draft's value. Nothing
reported it.
"""
from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from bs4 import BeautifulSoup  # noqa: E402

from converter.services.fold_helpers import route_area_css_to_block_attrs  # noqa: E402


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


class TestPerAreaGapIsTraced:
    def test_missing_area_attr_emits_a_finding(self):
        """The load-bearing case: no destination -> a finding, not silence."""
        seen: list[tuple[str, dict]] = []
        node = _node('<div class="sgs-product-card__body">x</div>')
        attrs: dict = {}
        route_area_css_to_block_attrs(
            node, "body", "sgs/product-card", attrs,
            {".sgs-product-card__body": {"padding": "20px"}},
            trace=lambda stage, **kw: seen.append((stage, kw)),
        )
        assert seen, (
            "REGRESSION: a per-area property with no destination attr produced "
            "NO trace finding. fold_helpers builds it; assembly.py must pass "
            "trace= or it goes to _noop_trace and the drop is invisible "
            "(Spec 31 §3.A step 8)."
        )
        assert any(kw.get("reason") == "no_area_attr" for _, kw in seen)
        # And nothing was written — this really is a drop, not a silent success.
        assert attrs == {}

    def test_trace_carries_enough_to_diagnose(self):
        """A finding with no owning block / property / source class is useless."""
        seen: list[dict] = []
        node = _node('<div class="sgs-product-card__body">x</div>')
        route_area_css_to_block_attrs(
            node, "body", "sgs/product-card", {},
            {".sgs-product-card__body": {"padding": "20px"}},
            trace=lambda stage, **kw: seen.append(kw),
        )
        assert seen
        kw = seen[0]
        for key in ("owning_block", "element_token", "css_property", "source_class"):
            assert key in kw, f"trace finding missing {key!r}: {kw}"

    def test_assembly_call_sites_pass_a_real_trace(self):
        """NEGATIVE CONTROL on the WIRING, not just the helper.

        The helper has always been able to emit; the bug was that assembly.py
        never gave it anywhere to emit TO. Asserting on the source keeps the
        kwarg from being quietly dropped again in a future refactor.
        """
        src = (_SCRIPTS_DIR / "converter" / "services" / "assembly.py").read_text(
            encoding="utf-8"
        )
        assert "trace=_fold_trace" in src, (
            "assembly.py no longer passes a real trace callable to the fold "
            "helpers — per-area/band gaps are silent again."
        )
        # Both fold call sites must be wired, not just one.
        assert src.count("trace=_fold_trace") >= 2, (
            "only one fold call site is wired; step 3c (band fold) and step 3d "
            "(per-area fold) BOTH default to _noop_trace."
        )
