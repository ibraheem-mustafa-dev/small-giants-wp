# core/heading + core/paragraph migration — BLOCKED pending design decisions, 2026-07-15

verdict: BLOCKED
first_paint_capture_passed: false

**Not a failure — the gate working.** The transformers are built, proven, and
produce byte-correct output (51 headings + 121 paragraphs transform cleanly;
4 bound paragraphs correctly REFUSED). The swap was applied, live-verified,
and **reverted** because live comparison proved it changes rendering in ways
only Bean can sign off (R-31-13). The canary is back on the verified state
(theme 1.5.26 = image pairing only).

Method: content-keyed computed-style comparison of a BEFORE page (core blocks
at git HEAD) vs an AFTER page (migrated markup), both rendered live — rule 4a.
Test pages: /tc-about-stats-before/ (1471), /tc-about-stats-after/ (1472).

---

## Finding 1 — `sgs/heading` `textColour` default overrides the theme's heading colour (D338 class) — BLOCKS the heading sweep

**Proven live, with the matched rules:**

| | rendered colour | why |
|---|---|---|
| `core/heading` (no colour set) | `rgb(230,138,149)` pink | inherits the theme's `h1,h2,…,h6 { color: var(--wp--preset--color--primary) }` (0,0,1) |
| `sgs/heading` (no colour set) | `rgb(58,46,38)` brown | emits `.sgs-hdg-xxx.wp-block-sgs-heading { color: var(--wp--preset--color--text) }` (0,2,0) — **because `textColour` has `default: "text"`** — which beats the theme rule |

Every migrated heading silently loses the client's heading colour. This is
**exactly** the DEFAULT-vs-HARDCODE class Track A fixed on this same block at
D338 (`fontSize: 28 → null`): a block default that duplicates/overrides a
theme-level default disables the theme. `textColour: "text"` is the same bug,
unfixed — and it affects **every `sgs/heading` on every client**, not just
migrations. A second rule does the same job:
`heading/style.css:16 .wp-block-sgs-heading:not([class*="has-text-color"]) { color: var(--wp--preset--color--text) }`.

**Proposed fix (needs Bean — high blast radius, Rule 7 design-gate):** default
`textColour` to `null`/`''` (= inherit, the canonical pattern per CLAUDE.md)
and drop the style.css fallback, so theme.json owns heading colour.

## Finding 2 — heading letter-spacing is keyed to the CORE class — BLOCKS the heading sweep

`core-blocks-critical.css:246 .wp-block-heading { letter-spacing: -0.01em }`
is keyed to the class **core/heading** emits. `sgs/heading` doesn't carry it,
so migrated headings render `letter-spacing: normal` (measured: `-0.36px` →
`normal`). As the framework migrates off core blocks, theme rules keyed to
core classes must either cover the SGS equivalent or move into theme.json
`elements.heading` (the DB/token-driven route — preferred).

## Finding 3 — ⚠ PRE-EXISTING FRAMEWORK BUG: the palette slug `text` collides with WP's reserved `has-text-color` marker class

**Not caused by this work; found by it. Affects every client on the default palette.**

WordPress auto-generates one class per palette entry:
`.has-text-color { color: var(--wp--preset--color--text) !important }` for the
palette colour slugged **`text`**. But `has-text-color` is *also* WP's generic
marker class, added to **any** block that sets an explicit text colour. So:

```
core/paragraph {"textColor":"primary"}
  -> class="has-primary-color has-text-color"
  -> .has-primary-color { color: primary  !important }   (0,1,0)
  -> .has-text-color    { color: text     !important }   (0,1,0)  <-- later, WINS
  -> renders BROWN, not the authored pink
```

Measured live: that paragraph paints `rgb(58,46,38)` while its own markup says
`primary`. **Every explicit colour on every core block is being clobbered to
`--text`.** SGS blocks are immune (they emit scoped rules, not `has-*` classes)
— which is why the migrated `sgs/text` renders the authored pink correctly.

Consequence for the sweep: migrating 121 paragraphs would *fix* their colour,
i.e. change the site's rendered appearance in ~121 places — correct, but a
visible site-wide change that needs Bean's eye (R-31-13), not a silent side
effect of a migration commit.

**Proposed fix (needs Bean):** rename the palette slug `text` → e.g.
`ink`/`body` across theme.json + the per-client `theme-snapshot.json` +
every consumer, OR stop relying on `has-*` colour classes. Blast radius is
large (every client snapshot references the slug) → design-gate.

---

## What ships instead
The transformers + probes (`pairings/heading_pairing.py`,
`pairings/paragraph_pairing.py`, `pairings/typography_common.py`,
`probe-text-equivalence.js`, `probe-heading-cascade.js`,
`publish-pattern-pair.py`) are committed unused. Once Findings 1–3 are
decided, the sweep is two commands + a re-verify.

Verified-correct transformer behaviour (kept as evidence):
- `"level":3` (int) → `"level":"h3"` (string enum) — without this WP coerces
  to the `h2` default and every h3 silently demotes (D328/D291 class).
- `style.typography.letterSpacing:"0.1em"` → `letterSpacing:0.1` +
  `letterSpacingUnit:"em"`; fontWeight/textTransform/fontStyle/lineHeight
  likewise mapped to typed attrs.
- `textColor` → `textColour`; `align` → `textAlign`; preset `fontSize` slugs
  now survive (this session's preset-gap fix).
- 4 `core/paragraph` instances in `contact-form.php` REFUSED: they bind
  `content` to `sgs/site-info` via `metadata.bindings`, and WP resolves
  bindings **only** for the core-block allowlist in
  `get_block_bindings_supported_attributes()` (read on live WP 7.0.1).
  Migrating them would render the binding inert — see the gap register.
