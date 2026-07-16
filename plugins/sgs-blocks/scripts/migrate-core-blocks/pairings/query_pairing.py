#!/usr/bin/env python3
"""core/query -> sgs/post-grid — REFUSE-ALL (design-decision gap, not a bug).

VERDICT: needs-design-decision. This module deliberately never returns a
TransformResult — every instance is refused via GapError, loudly, into the
register, per the contract's "refusing is CORRECT, not failure" doctrine.
It exists (rather than being left unwritten) so `--pairing core/query` dry-
runs cleanly and the register carries the evidence below instead of an
ImportError.

GROUND TRUTH (read in full, 2026-07-16):
  - All 3 real instances: theme/sgs-theme/templates/{archive,index,search}.html.
  - sgs/post-grid block.json + render.php (self-built WP_Query, own card
    markup — plugins/sgs-blocks/src/blocks/post-grid/).
  - core/query semantics: WordPress/gutenberg trunk block-library docs
    (Query Loop) — `query.inherit` defers entirely to WP's main query
    object rather than building its own WP_Query.

WHY THIS CANNOT BE A TRANSFORMER (two independent, each-sufficient reasons):

1. THE INHERIT TRAP. All 3 real instances set `"inherit":true`:
     - archive.html:  {"perPage":12,"pages":0,"offset":0,"postType":"post",
                        "order":"desc","orderBy":"date","inherit":true}
     - index.html:    {"perPage":10,"pages":0,"offset":0,"postType":"post",
                        "order":"desc","orderBy":"date","inherit":true}
     - search.html:   {"perPage":10,"pages":0,"offset":0,"postType":"post",
                        "order":"desc","orderBy":"relevance","inherit":true}
   `inherit:true` means "don't build a query — use whatever WordPress
   already resolved for this request" (the category being browsed on
   archive.html, the search term + `orderby=relevance` on search.html).
   sgs/post-grid's render.php ALWAYS builds its own `new WP_Query($query_args)`
   from block attributes (postType/categories/tags/order/orderBy/offset) —
   there is no "use the current main query" mode, and there cannot be one
   without a new capability: the block has no way to read the current
   category term, the current search string, or WP's `is_search()` /
   `is_category()` context. Swapping any of these 3 instances today would:
     - archive.html:  show ALL posts of `postType:post` site-wide, not just
                       the ones in whatever category the visitor is browsing
                       — the archive page silently stops filtering by term.
     - index.html:    happens to be harmless (the front page's "main query"
                       already IS "all posts", so a fixed WP_Query with no
                       category filter is coincidentally equivalent) — but
                       this is a coincidence of ONE instance's context, not
                       a property of the pairing, and cannot be generalised.
     - search.html:   `orderBy:"relevance"` requires WP's search relevance
                       ordering, which only exists when a search term (`s`)
                       is present in the query; sgs/post-grid's render.php
                       never reads the current search term, so
                       `orderby=relevance` with no `s` param falls back to
                       WP_Query's default ordering — search results would
                       stop being sorted by relevance and the search filter
                       itself would be silently dropped (every published
                       post would show, not just search matches).
   This is not a per-instance content gap fixable by better attribute
   mapping — it's a missing sgs/post-grid CAPABILITY (an "inherit the
   current main query" mode). That is a design decision for Bean, not
   something a transformer can paper over.

2. THE N:1 STRUCTURAL COLLAPSE. core/query is a WRAPPER; its actual card
   markup lives in nested core/post-template -> core/group("article") ->
   core/post-featured-image + core/post-title + core/post-date +
   core/post-excerpt. sgs/post-grid is ONE self-contained block that builds
   its OWN card HTML (Post_Grid_REST::render_card()) — it does not, and
   structurally cannot, consume arbitrary InnerBlocks as a card template.
   Mechanically the driver COULD replace the whole span (a TransformResult
   for the outer core/query node replaces node.start:node.end, which
   includes every descendant's markup, since post-template/pagination/
   no-results are all nested inside the query node) — so the N:1 collapse
   is not a driver-mechanics blocker by itself. But it means a "faithful"
   transform would have to THROW AWAY every per-instance customisation
   authored in the post-template (archive.html's custom h3/fontSize/
   border-radius/padding card design, search.html's border-bottom divider
   style, index.html's plain layout) and replace it with sgs/post-grid's
   own fixed card renderer + its titleColour/excerptColour/cardStyle/
   columns attribute surface. That is a real, lossy redesign per instance,
   not a mechanical schema conversion — the same class of judgement call
   flagged in cardStyle for latest_posts_pairing.py, but far larger in
   scope (a whole card layout, not one enum choice).

WHAT WOULD MAKE THIS BUILDABLE: sgs/post-grid needs an explicit
`"inherit": true`-equivalent attribute (query the current main WP_Query /
current archive term / current search string rather than building its own),
verified against each of `is_archive()` / `is_search()` / `is_category()`
context. Until that capability exists, migrating archive.html and
search.html would be a silent behaviour regression (R-31-1-class: an
implicit "coincidentally works" case standing in for a universal rule).
index.html *could* be migrated safely on its own merits (its main query
genuinely has no extra filtering to lose) but doing that alone would be
exactly the per-instance carve-out this project's Rule 3 (universal, no
carve-outs) forbids — one instance being safe doesn't make the PAIRING safe.

RECOMMENDATION: park this pairing. Either (a) build the "inherit main
query" capability on sgs/post-grid first, re-evaluate with real query
context tests on archive/search templates, or (b) accept core/query stays
on these 3 templates permanently (leave them out of Track C's replacement
scope) since query.html templates are template-level scaffolding, not
authored content pages — the "convert every core block" mandate may not
need to reach template files that WordPress itself generates the query
context for. That is Bean's call, not mine.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from contract import GapError  # noqa: E402


def transform(node, text):
    attrs_in = node.attrs or {}
    query_obj = attrs_in.get('query') or {}
    inherit = query_obj.get('inherit')
    order_by = query_obj.get('orderBy')
    reason = (
        'core/query -> sgs/post-grid refused for ALL instances (design-decision gap, see '
        'query_pairing.py module docstring for full evidence): sgs/post-grid always builds its '
        'own WP_Query from fixed block attributes and has no "inherit the current main query" '
        'capability, but this instance sets inherit=%r (query.orderBy=%r) — migrating would '
        'silently drop the current archive/search filtering context. Also a structural N:1 '
        'collapse (query wraps core/post-template + nested title/date/excerpt/image blocks with '
        'per-instance card customisation sgs/post-grid cannot consume). Needs an sgs/post-grid '
        'capability addition + Bean design decision, not a mechanical attribute transform.'
    ) % (inherit, order_by)
    raise GapError(reason)
