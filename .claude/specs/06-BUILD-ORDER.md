# SGS Build Order — Current Roadmap

> **Last updated:** 2026-04-30. Replaces the original 4-phase build plan after full completion of phases 1–5. The original is archived at [`../plans/archive/2026-04-30-archived-06-build-order.md`](../plans/archive/2026-04-30-archived-06-build-order.md).

## Status snapshot

Framework **v1 shipped** 2026-04-29. Phases 0–5 complete.

| Component | State | Notes |
|---|---|---|
| `sgs-theme` | Shipped | 8 style variations, 29 patterns, mega-menu template parts, 8 frontend JS modules. theme.json v3, Inter variable + DM Serif/Sans + Montserrat/Source Sans 3 (per variation). |
| `sgs-blocks` | Shipped | 59 blocks (51 dynamic + 8 static), block extensions (animation, hover, visibility, off-canvas), Block Defaults system. Pre-commit uniformity audit (added 2026-04-30). |
| `sgs-blocks/forms` | Shipped | 12 form field blocks, REST endpoint, N8N webhook integration, 4-step pattern. |
| Style variations | 8 shipped | `eye-care-ward-end`, `helping-doctors`, `indus-foods`, `mamas-munches` (added 2026-04-30 — coral/cream/Fraunces), `sgs-construction`, `sgs-healthcare`, `sgs-mosque`, `sgs-professional`. |
| IDE infrastructure | Shipped | `composer.json` + `vendor/php-stubs/wordpress-stubs` v6.9.1 (matches palestine-lives.org); Intelephense configured via `.vscode/settings.json`. |
| Pre-commit audit | Shipped | `plugins/sgs-blocks/scripts/audit-block-uniformity.py` enforced via `.git/hooks/pre-commit`. Catches `viewScript` regressions, `source:html` on dynamic blocks, typography duplication, and missing `supports.color`. |

## Active initiative

### HTML mockup → SGS blocks compiler

**Status:** Researched 2026-04-30, not yet built. Build estimate: 3.5–4 days.

**Why:** Today, building one block from a mockup takes ~half a day (read HTML → identify dynamic sections → write block.json/render.php/edit.js by hand). The compiler reduces this to ~10 min/block.

**Approach:**
- Fork [Verneaut's `html-to-gutenberg`](https://github.com/jverneaut/html-to-gutenberg) and add SGS-specific processors
- Annotation grammar: `data-sgs="name:type"` (8 types: text/image/link/bool/array/innerblocks/business/colour-token)
- `block.config.json` sidecar carries non-HTML-expressible attributes (responsive variants, hover behaviour, palette tokens)
- AI annotator pre-step uses Anthropic structured output to add `data-sgs` attributes to plain HTML
- `--mode=pattern` flag emits `register_block_pattern()` PHP for design-pattern mode
- Ships as `/sgs-mockup-to-block` skill + slash command

**Research doc:** `~/.openclaw/workspace/memory/research/2026-04-30-html-mockup-to-sgs-blocks.md`

**Recommended model for build:** Sonnet 4.6 (mostly pattern-following work; not novel architecture).

## Recently shipped (2026-04-30)

- **Block uniformity overhaul** — 13 blocks improved. Hero migrated to `viewScriptModule`. mega-menu `source:html` bug fixed. Hero / cta-section / info-box typography deduplication. announcement-bar + google-reviews migrated from custom UK colour attrs to native `supports.color` (with backward-compat shim for legacy posts).
- **Selector naming canonical** — All 28 dynamic blocks now use `.wp-block-sgs-{name}` for `selectors.root`. All 8 static blocks use `.sgs-{name}` (their save.js class). Standardised across the framework.
- **Pre-commit audit script** — `plugins/sgs-blocks/scripts/audit-block-uniformity.py`. Wired into `.git/hooks/pre-commit` (appends to existing gitleaks check). Runs only when `block.json` files are staged.
- **Composer + WordPress stubs** — `composer.json` + `composer.lock` at repo root. `php-stubs/wordpress-stubs` v6.9.1 + `php-stubs/wp-cli-stubs` v2.12.0 to `vendor/` (gitignored). VS Code Intelephense points at the Composer-installed stubs.
- **Dead code removed** — both copies of the orphaned `footer-indus-foods.php` pattern (one was a CLAUDE.md violation, the other referenced a non-existent block).
- **`mamas-munches.json` style variation** — coral/cream/Fraunces palette built this branch.

## Deferred / planned (not yet built)

| Component | Spec | Status | Notes |
|---|---|---|---|
| `sgs-booking` plugin | [`03-SGS-BOOKING.md`](03-SGS-BOOKING.md) | Spec only | Thin REST client against the Next.js booking system (separate project). |
| `sgs-client-notes` plugin | [`05-SGS-CLIENT-NOTES.md`](05-SGS-CLIENT-NOTES.md) | Spec only | Visual annotation system for client review. Independent of theme. |
| `sgs-popups` plugin | [`07-SGS-POPUPS.md`](07-SGS-POPUPS.md) | Spec only | Conversion pop-ups. |
| `sgs-chatbot` plugin | [`08-SGS-CHATBOT.md`](08-SGS-CHATBOT.md) | Spec only | Live chat + AI chatbot. |

## Polish backlog (low priority, non-blocking)

- **Gold-standard audit refresh** — [`09-GOLD-STANDARD-AUDIT.md`](09-GOLD-STANDARD-AUDIT.md) covers ~25 of 59 blocks. Add comparison rows for the 34 newer blocks (post-grid, gallery, tabs, countdown, star-rating, team-member, pricing-table, modal, breadcrumbs, table-of-contents, icon-block, social-icons, mobile-nav, mega-menu, announcement-bar, etc.).
- **announcement-bar / google-reviews legacy custom UK attrs** — `backgroundColour` / `textColour` are kept as fallback in render.php's `??` chain. Can be removed in a future major version after a full content sweep confirms no posts still rely on them.
- **`/library-docs` cache** for block-editor APIs — may be worth memoising common WP block API doc lookups locally.
- **Extension docs** — `plugins/sgs-blocks/src/blocks/extensions/` has animation, hover, visibility, off-canvas extensions. They're documented in `02-SGS-BLOCKS.md` and `architecture.md` but a dedicated extensions reference is not written.
- **Master feature audit refresh** — `docs/plans/2026-02-21-master-feature-audit.md` last updated 2026-02-26. Percentages are stale.

## Truth documents

| Doc | Purpose |
|---|---|
| [`../architecture.md`](../architecture.md) | Combined system design + 354-feature audit + dev setup. Cold-start reading. |
| [`../../CLAUDE.md`](../../CLAUDE.md) | Hard rules, deploy commands, gotchas. |
| [`../../docs/plans/2026-02-21-master-feature-audit.md`](../../docs/plans/2026-02-21-master-feature-audit.md) | 354-feature graded roadmap. Last full refresh 2026-02-26 — directional, not current. |
| [`../plans/strategy/2026-04-24-design-brain-architecture.md`](../plans/strategy/2026-04-24-design-brain-architecture.md) | Pipeline 6 (QA → Deploy) and Council reviewer architecture. |
| [`./2026-04-27-optimisation-toolkit-design.md`](2026-04-27-optimisation-toolkit-design.md) | Optimisation toolkit + rubric system. |
| [`./common-wp-styling-errors.md`](common-wp-styling-errors.md) | Real failure-pattern catalogue from 2026-04-29 polish session + 2026-04-30 audit. |
