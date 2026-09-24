"""orchestrator/boundary_nesting.py::nested_item_owners — a loop item inside another boundary is
owned by it; a top-level item has no owner.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest tests/test_boundary_nesting.py -q
"""
from __future__ import annotations

import importlib.util
import pathlib

SCRIPTS = pathlib.Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("boundary_nesting_under_test", SCRIPTS / "orchestrator" / "boundary_nesting.py")
bn = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bn)

HTML = """<body>
<header data-sgs-boundary-id="b2"><sc-for><a data-sgs-boundary-id="b33">{{ s.name }}</a></sc-for></header>
<section data-sgs-boundary-id="b5"><sc-for><div data-sgs-boundary-id="b38">
  <sc-for><button data-sgs-boundary-id="b39">swatch</button></sc-for></div></sc-for></section>
<sc-for><div data-sgs-boundary-id="b65">{{ it.name }}</div></sc-for>
</body>"""


def test_nested_items_map_to_their_nearest_owner():
    owners = bn.nested_item_owners(HTML, {"b33", "b38", "b39", "b65"})
    assert owners == {"b33": "b2", "b38": "b5", "b39": "b38"}


def test_a_top_level_item_and_a_container_are_never_owned():
    """Negative controls: b65 has no enclosing boundary; b5 is a container, not asked about."""
    owners = bn.nested_item_owners(HTML, {"b65"})
    assert owners == {}
    assert "b5" not in bn.nested_item_owners(HTML, {"b33", "b38", "b39", "b65"})


def test_no_items_is_a_no_op():
    assert bn.nested_item_owners(HTML, set()) == {}
