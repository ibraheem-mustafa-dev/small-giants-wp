"""2026-07-25-quote-body-attribution-slot-fix.py

Fixes the sgs/quote self-nesting cloning bug (3-block emit instead of 1).

ROOT CAUSE (proven via reproduce on tests/fixtures/conformance/sgs-quote.html):

  1. The draft's `<blockquote class="sgs-quote__body">` (the quote BODY) has
     NO matching vocabulary entry for the bare element token "body" anywhere
     in `slots` (scope='element'). Because it misses, resolution falls
     through `_resolve_slug_from_bem_tuple`'s Path-2 "block segment"
     fallback, which tries the BEM *block* segment ("quote" — always the
     owning block's own short slug) against the SAME global alias map. The
     "quote" slots row (slot_name='quote', standalone_block='sgs/quote') is
     registered under its OWN slot_name key regardless of its aliases list
     (`_slot_alias_to_standalone`'s `_put(slot_name, standalone)` runs before
     the alias loop), so ANY unrecognised element of sgs/quote's own family
     self-resolves to sgs/quote — producing a nested wp:sgs/quote instead of
     the correct wp:sgs/text child. This is a UNIVERSAL footgun (blub.db
     R-31-9 scope): every block whose short slug equals an existing
     standalone-block-bearing slot_name (heading, label, media, button,
     icon, quote, tab, testimonial, option-picker, accordion-item …) shares
     the same latent self-nesting risk for any of its own unrecognised
     child elements. Flagged for the main session as a design-gate
     candidate; NOT fixed here (that would be a converter/walker code
     change, out of scope for this seed-level fix — see the
     `resolve_slug_from_bem`/`_resolve_slug_from_bem_tuple` Path-2
     block-segment fallback in converter/db/db_lookup.py).

  2. The `attribution` scalar attr (block_attributes: sgs/quote.attribution)
     has `canonical_slot=NULL`, so `content_attr_for_element`'s alias-tier
     (tier 1) can never match it against any element token via a slots
     alias — it only ever matches by EXACT attr-name equality (tier 0).
     Combined with the conformance fixture using a non-canonical class name
     (`sgs-quote__author` instead of render.php's real canonical
     `.wp-block-sgs-quote__attribution`), the author/attribution element
     never lifts onto the parent's own `attribution` scalar attr and
     instead falls through to generic child-block routing (global "text"
     slot alias "author" → sgs/text), producing a stray wp:sgs/text sibling
     instead of the correct SCALAR `attribution` attr on the outer quote.

FIX (seed-source only — R-31-1, no converter/walker code touched):

  (a) [SUPERSEDED 2026-07-25 by Bean's correction — now REMOVES "body"]
      The original (a) added "body" as a generic `text` slot alias. Bean
      corrected it: "body" frequently names the whole CONTENT GROUP of a
      block (product-card's `__body` wraps everything bar the image), NOT a
      single text leaf, so a universal body→sgs/text alias would flatten a
      content wrapper to one text block. The universal Path-2 SELF-NEST GUARD
      (converter/db/db_lookup.py, added same day) + the FR-31-4.1 content-leaf
      rule now resolve the quote body correctly WITHOUT any alias: the
      text-only `sgs-quote__body` leaf becomes a sgs/text child. This step is
      now an idempotent REMOVAL of "body" from the text aliases so a reseed
      reproduces the correct alias-free state.

  (b) Add a NEW element-scope slot `attribution` (aliases=["author"],
      standalone_block=NULL). NULL standalone_block means
      `_slot_alias_to_standalone()` (used by `resolve_slug_from_bem`) never
      picks this row up — it exists PURELY for `content_attr_for_element`'s
      alias-tier matching (that query does not filter on standalone_block).
      This lets any block's content-bearing attr declare
      `canonical_slot='attribution'` and have an "author"-classed element
      lift onto it, universally reusable (e.g. sgs/testimonial's author
      byline), not a quote-specific carve-out.

  (c) block_attributes reclassification for sgs/quote's attribution family —
      see attr-classification-overrides.json (applied separately by
      sgs-update-v2.py Stage 1C, NOT by this migration): `attribution`
      gets canonical_slot='attribution' + derived_selector=
      '.sgs-quote__attribution' (was NULL / '.sgs-quote__text'); 5 straggler
      attributionFontStyle/attributionMarginTop(Tablet|Mobile)/
      attributionMarginUnit rows get derived_selector corrected from the
      same stale '.sgs-quote__text' to '.sgs-quote__attribution' (matching
      the rest of the already-correct attributionColour/FontSize/etc rows).

  (d) Conformance fixture (tests/fixtures/conformance/sgs-quote.html):
      rename the author element's class + matching CSS selector from
      `sgs-quote__author` to the canonical `sgs-quote__attribution` (render.
      php's real emitted class), per Spec 00 §3.1 SGS-BEM discipline — the
      fixture's `__author` was the authoring error, not the vocabulary.

Idempotent: re-running is a no-op (checks membership/existence before
writing). Safe against a fresh /sgs-update reseed — see the reasoning
above: sgs-update-v2.py's Stage 1/5 code only UPDATEs `slots.standalone_block`
for UNMAPPED rows and never touches the `aliases` column or inserts new
`slots` rows, so this migration's slots-table writes are NOT clobbered by a
reseed. attr-classification-overrides.json IS re-applied on every
/sgs-update (Stage 1C, final writer) — its entries are load-bearing and
reseed-durable by design.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def main() -> None:
    conn = sqlite3.connect(SGS_DB)
    try:
        c = conn.cursor()

        # ---- (a) ensure "body" is NOT a `text` slot alias (Bean, 2026-07-25) ----
        # SUPERSEDED: the original (a) ADDED "body" as a generic text alias.
        # Bean corrected this — "body" frequently names the whole CONTENT GROUP
        # of a block (e.g. product-card's `__body` wraps everything bar the
        # image), NOT a single text leaf, so a universal body→sgs/text alias
        # would flatten a content wrapper to one text block. The quote body now
        # resolves via the universal Path-2 self-nest guard + FR-31-4.1
        # content-leaf rule (a text-only `sgs-quote__body` leaf becomes a
        # sgs/text child) — NO alias required. This step now REMOVES "body"
        # idempotently so a reseed reproduces the correct (alias-free) state.
        row = c.execute(
            "SELECT aliases FROM slots WHERE slot_name='text' AND scope='element'"
        ).fetchone()
        if row is None:
            raise RuntimeError("slots row slot_name='text' scope='element' not found")
        aliases = json.loads(row[0]) if row[0] else []
        if "body" in aliases:
            aliases = [a for a in aliases if a != "body"]
            c.execute(
                "UPDATE slots SET aliases=? WHERE slot_name='text' AND scope='element'",
                (json.dumps(aliases),),
            )
            print("[slots] text.aliases -= 'body' (reverted; body is a content-group name, not a text leaf)")
        else:
            print("[slots] text.aliases has no 'body' — no-op")

        # ---- (b) new `attribution` element-scope slot (standalone_block NULL) ----
        exists = c.execute(
            "SELECT 1 FROM slots WHERE slot_name='attribution' AND scope='element'"
        ).fetchone()
        if exists is None:
            c.execute(
                "INSERT INTO slots (slot_name, scope, aliases, standalone_block, notes) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    "attribution",
                    "element",
                    json.dumps(["author"]),
                    None,
                    "Attribution/author scalar content slot — content_attr_for_element "
                    "alias-tier ONLY (standalone_block intentionally NULL so "
                    "resolve_slug_from_bem/_slot_alias_to_standalone never routes it to "
                    "a standalone child block). Universal: any block's content-bearing "
                    "attr may declare canonical_slot='attribution' to accept an "
                    "'author'-classed draft element as its own scalar value. Added "
                    "2026-07-25 fixing the sgs/quote 3-block cloning bug.",
                ),
            )
            print("[slots] inserted new row slot_name='attribution' scope='element'")
        else:
            print("[slots] slot_name='attribution' scope='element' already exists — no-op")

        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
