"""Resolver registry.

Each resolver is a single-purpose file exporting ``resolve(decl, ctx) -> Write | GAP``
(the contract in design §3.1). The registry maps a resolver id (from
``dispatch_table.resolver_id``) to its callable so the orchestrator can dispatch by
data, never by ``if slug ==`` branching.

Populated in the slice build (Task 2). Empty in the Task-1 skeleton so the static
gates (no-slug-literal, import-ban) baseline against a clean tree.
"""

# resolver_id -> callable. Filled by Task 2 (outer_box real; 6 stubs).
REGISTRY: dict = {}
