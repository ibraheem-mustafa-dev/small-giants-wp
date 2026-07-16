#!/usr/bin/env python3
"""core/post-template -> sgs/post-grid — REFUSE-ALL (no standalone target exists).

VERDICT: refuse-all (not even a "needs-design-decision" — this one is a
category error in the pairing map, not an open question).

core/post-template is not a content block; it is a REPEATER TEMPLATE that
only has meaning nested inside a core/query ancestor (WP_Query::the_post()
loops over it once per result). There is no `sgs/post-template` block and
no standalone SGS equivalent — sgs/post-grid does not consume an inner
template at all; it renders its own fixed card markup
(Post_Grid_REST::render_card()) directly from block attributes. Swapping a
core/post-template node IN ISOLATION would mean picking some arbitrary
fragment of sgs/post-grid to emit with no query context, no repeat
semantics, and no relationship to the surrounding core/query — there is
nothing "post-template shaped" to convert TO.

GROUND TRUTH (read in full, 2026-07-16): the 3 real instances are all
INSIDE core/query in theme/sgs-theme/templates/{archive,index,search}.html
(see query_pairing.py's module docstring for the full per-template detail).
None exists outside a core/query wrapper anywhere in theme/sgs-theme/.

`blocks.replaces` / block-replacements.json lists core/post-template as one
of sgs/post-grid's replaced-cores alongside core/query and core/latest-posts
— that entry describes the FAMILY relationship (post-template is core/
query's child, and the family collectively corresponds to what sgs/post-
grid does), not an instruction that post-template has an independent 1:1
target. Recorded here as a data-model note, not something to silently
"fix" in this module.

RUN ORDER (why this file exists at all rather than being deleted from the
pairing map): core/query's own transform (query_pairing.py) replaces the
ENTIRE span of the outer core/query node — including every nested
core/post-template, post-title, post-date, post-excerpt, post-featured-
image, query-pagination, and query-no-results block inside it, since the
driver's per-node span covers opener-to-closer of the OUTER node only when
`core/query` itself is the pairing being run. So:
  - core/query is refused (query_pairing.py) => nothing is swallowed, the
    post-template nodes are left untouched in the file.
  - If `--pairing core/post-template` is then run standalone, this module
    correctly refuses each instance too (below) — never a silent partial
    swap that would leave a query with no template, or a template with no
    outer query.
  - If core/query's capability gap is ever closed and query_pairing.py
    starts emitting real transforms, `core/post-template` MUST run first
    and would find ZERO instances (all 3 already swallowed by the query
    swap) and become a no-op — it does NOT need to run before core/query;
    order between the two pairings is irrelevant precisely BECAUSE this
    module never independently transforms anything. If that ever changes,
    core/query must run before core/post-template (parent consumes child).

Do not extend this module to attempt a "just convert the title/date/excerpt
fields inside" partial transform — that produces orphaned sgs/post-grid
markup with no query loop around it, which is a worse failure mode than
refusing (an orphaned single-post-shaped fragment rendering once instead of
per-post, with no visible error).
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from contract import GapError  # noqa: E402


def transform(node, text):
    raise GapError(
        'core/post-template -> sgs/post-grid refused for ALL instances: core/post-template has '
        'no standalone SGS equivalent (it is a repeater template, only meaningful nested inside a '
        'core/query ancestor; sgs/post-grid renders its own fixed card markup and consumes no inner '
        'template at all). See post_template_pairing.py module docstring. Not a per-instance content '
        'gap — a category error in treating this as an independently-transformable block.'
    )
