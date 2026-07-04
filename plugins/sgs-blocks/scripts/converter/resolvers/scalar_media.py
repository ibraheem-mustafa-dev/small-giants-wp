"""scalar_media — retired CSS-dispatch stub (design §3 / §3.2; retired 2026-07-04).

EXECUTION Step 12 (2026-07-04) DELETED the `resolve(decl, ctx) -> GAP` stub that
used to live here (and its "scalar_media" REGISTRY entry in
converter/resolvers/__init__.py, and its dispatch_table.resolver_id branch keyed
on `delegates_content == 0`) — proven unreachable from resolver_id's one
production call site.

GROUND-TRUTH: source=file evidence=`converter/services/layer_detect.py::layer_detect`
is called exactly once per element (`orchestrator.process_element`, cached on
`ctx.base_layer`) and every one of its code paths returns a value in
`{"OUTER", "GRID_AREA", "GRID", "CONTENT"}` — never `None`, never anything the
removed `delegates_content == 0` branch needed to fire on. All 4 of those layers
already have a registered resolver (`_LAYER_TO_RESOLVER` in dispatch_table.py), so
the branch this stub served could only ever be reached synthetically (a test
passing a fabricated out-of-domain `layer` string), never in the real pipeline.
See `converter/tests/test_dispatch_table.py` for the reachability proof test.

This module is kept (rather than deleted outright) as the named placeholder for a
FUTURE genuine scalar-leaf CSS-dispatch resolver, should one ever be designed —
that design would need a NEW named layer value that `layer_detect` actually
produces (not a resurrection of the `delegates_content` gate, which routed here
without ever being reachable). `db_lookup.scalar_media_attr_for` (a real, live,
unrelated DB lookup used by the content-side media lift in
`converter/services/extraction.py`) is UNTOUCHED by this retirement.
"""
from __future__ import annotations
