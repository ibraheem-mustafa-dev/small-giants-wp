# Track B casualty register — both sites, scanned 2026-07-15

Source: `wp post get <id> --field=post_content` (read-only) over every page/post on
palestine-lives.org (22 posts) + sandybrown (28 posts). Scanner:
`plugins/sgs-blocks/scripts/audit-post-content-blocks.py` (schema/source-derived,
no hardcoded block lists). Machine detail: `register.json`. Raw backups: per-ID
`.txt` files in this directory (verified readable; page 13 = 22,012 bytes exactly).

## Cause group 1 — stranded InnerBlocks content (62 blocks, HIGH)

Old self-closing scalar shape; render.php now renders children only. Content intact
in DB, renders an empty shell. Fix: editor-route migration (scalar attrs → child
blocks) via `scripts/wp-migrate-oldshape-blocks.js`.

| Post | Blocks | Priority |
|---|---|---|
| palestine-lives/13 — Indus Homepage | hero ×1, testimonial-slider ×1, info-box ×8 | **P0 — the mission** |
| palestine-lives/65 — Food Service | hero, slider, cta-section, info-box ×6 | P1 — real sector page |
| palestine-lives/66 — Manufacturing | hero, slider, cta-section, info-box ×6 | P1 |
| palestine-lives/67 — Retail | hero, slider, cta-section, info-box ×6 | P1 |
| palestine-lives/68 — Wholesale | hero, slider, cta-section, info-box ×6 | P1 |
| palestine-lives/58 — Apply for Trade Account | hero ×1 | P1 |
| palestine-lives/283 — Mamas Munches Homepage Test | hero, notice-banner | P2 — test page |
| palestine-lives/53 — Pattern Showcase | hero ×2 | P2 — test page |
| palestine-lives/52 — Block Test | tab ×3 | P2 — test page |
| sandybrown/65 — "Spec16-P7 converter v2 output [2026-05-15]" | hero, slider, info-box ×6 | **SKIP — frozen historical baseline artefact; migrating would falsify the record** |

## Cause group 2 — brand-strip legacy logo shape (1 block, HIGH — manual entry)

**palestine-lives/13**: `sgs/brand-strip` stores `logos: [{url, alt} ×4]` (Sanam,
Lemon Tree, Green Leaf, Shan Foods). render.php (lines ~313-336) accepts `media:{}`
or lifts legacy `image:{}` — the Spectra-era bare `{url, alt}` shape matches neither
→ `continue` skips every logo → 0 imgs. PROVEN against render.php this session.
Fix: attrs reshape to `{media:{url,type:'image',id:0,alt,mime:''}, alt, linkUrl:''}`.
NOTE: the scanner cannot generically detect item-shape mismatches inside declared
array attrs (no machine-readable item schema in block.json) — documented limitation.

## Cause group 3 — undeclared attrs (~308, HIGH)

WP silently discards these at parse; the first editor save DELETES them permanently.
The page-13 / sector-page instances (`headlineColour`, `iconColour`, `quoteColour`
etc.) are carried onto child blocks by the cause-1 migration. The remainder (form
field `name` ×14, `sgs/text tag` ×8, `sgs/media borderRadius` ×10, `hoverEffect`
×24…) live mostly on the same P1/P2 pages and on sandybrown test pages —
per-attr disposition needed before any editor save TOUCHES those posts. Rule: no
post gets saved through the editor until its undeclared attrs are dispositioned
(mapped or accepted-as-lost with Bean visibility).

## Cause group 4 — retired blocks (22 instances)

`sgs/announcement-bar`, `heritage-strip`, `svg-background`, `back-to-top`,
`icon-block`, `trust-badges`, `certification-bar`, `mobile-nav(+toggle)` — all
render deleted-block placeholders. These need re-authoring decisions (e.g.
announcement-bar → notice-banner `displayMode=announcement` per D209), NOT
mechanical migration. Posts: palestine-lives 52, 65-68 (heritage-strip ×4), 283;
sandybrown 65, 823, 824. → Parked for Bean; listed here so nothing is silent.

## Session scope decision

P0 first (page 13, full pipeline with dry-run + verify + Bean sign-off), then P1
pages by cause-group with the same script. P2 test pages + cause-4 retired blocks:
documented, deferred with reason (test artefacts / need design decisions). SKIP
entries are deliberate and recorded.

## Session outcome (2026-07-15, updated end of session)

**P0 DONE.** Page 13 restored + live-verified (hero text 142 chars, h1 present,
8/8 brand imgs loaded, 4 distinct testimonials, 8 info-boxes with icons, editor
opens with 0 invalid blocks / 0 recovery prompts). Screenshots sent to Bean;
his eye is the final close (R-31-13). Rehearsal draft 288 proved
migrate→restore→re-migrate.

**P1 DEFERRED with precise live-learned blockers (not silence):**
- **58** — preflight ABORTS (correctly): 1 invalid `core/button` would be
  silently rewritten by any editor save. Needs an eyes-on "Attempt Block
  Recovery" decision first. Then: `node scripts/wp-migrate-oldshape-blocks.js
  --site palestine-lives.org --post 58 --live`.
- **65/66/67/68** — need (a) a `sgs/cta-section` mapping added to
  `scripts/lib/oldshape-mappings.js` (fail-closed will name any gap), (b)
  disposition of each page's ~30 undeclared attrs (sgs/text `tag`, sgs/media
  `borderRadius(Unit)`, info-box `hoverEffect`/`iconSize`…) BEFORE the first
  editor save deletes them. Backups exist; `--from-backup` recovers values even
  after a premature save.
- **52/283 (P2)** — many invalid core blocks (19 on 283) + 283's hero carries an
  undeclared `eyebrow` (content-ish → needs a label-child disposition).
- **sandybrown/65** — SKIP stands (frozen conformance baseline artefact).

**Live findings folded back into the audit picture:**
- NEW cause discovered (page 13 brand-strip, proven): deployed block.json
  `logos.items.properties.media: "string"` (stale) makes WP's
  `prepare_attributes_for_render` silently reset the WHOLE `logos` attr to `[]`
  at render when items carry a media OBJECT — D328 class, items-sub-schema
  variant. Content-side fix shipped (legacy image-shape, which the render lifts);
  schema fixed in-tree; storage normalises via one editor round-trip after that
  deploys.
- The editor save round-trip appends inert SGS extension defaults
  (`sgsBlockLink`, `sgsClickEffect`…) to every block's serialized JSON — benign,
  pre-existing, now explicitly accepted by the migration verifier.
