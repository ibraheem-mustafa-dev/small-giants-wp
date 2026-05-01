---
doc_type: research-finding
topic: WordPress block validation — canonical prevention pattern for synthesised markup
date: 2026-05-01
research_skill: research-buddies
verdict: Build-time @wordpress/blocks parse+serialize round-trip in Node + auto-block-recovery plugin as runtime safety net + dynamic SGS blocks for long-term structural fix. Spectra's File Generation is unrelated (CSS/JS perf only).
---

# Block validation prevention — canonical pattern (2026-05-01)

## TL;DR

The "Block contains unexpected or invalid content" error is structural, not configurable. WordPress core's validation runs only in the editor, only on first load, only against static blocks' `save()` output. There is NO official server-side or WP-CLI bulk fix. The entire ecosystem has converged on:

1. **Avoid the problem** — make blocks dynamic (`save: null` + PHP render). Used by Spectra, ACF Blocks, GenerateBlocks v2.
2. **Auto-recover at editor-load** — `createBlock(name, attrs, innerBlocks)` JS module fires silently on every page open. Used by `auto-block-recovery` plugin, Spectra, Stackable.

Spectra's "File Generation / Regenerate Assets" is a CSS/JS perf feature, NOT a validation fix.

## Recommended pattern for SGS Recogniser

Three additive layers:
- **Build-time:** Node `@wordpress/blocks` parse+serialize on the recogniser's output before `wp post create`. Bypasses the safety hook, idempotent, fits existing toolchain.
- **Runtime safety net:** `auto-block-recovery` plugin pre-installed on all SGS client sites (or pattern bundled in sgs-theme as mu-plugin).
- **Long-term:** convert any remaining static SGS blocks to dynamic.

## Lateral applications (one pattern, five problems)

1. Site extraction → SGS replication
2. AI page generation
3. Bulk client onboarding (Wix/Squarespace → SGS)
4. SGS plugin updates that change save()
5. Pattern library imports

## Key sources

- https://github.com/shimotmk/auto-block-recovery (canonical `createBlock()` recovery pattern, active Nov 2025)
- https://github.com/brainstormforce/wp-spectra/blob/master/blocks-config/uagb-controls/autoBlockRecovery.js
- https://wpstackable.com/blog/how-to-recover-all-broken-blocks-in-one-command-in-wordpress/ (origin)
- https://github.com/WordPress/gutenberg/issues/7604 (Riad Benguella on validation being intentionally editor-only)
- https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-serialization-default-parser/
- https://github.com/10up/convert-to-blocks
- https://html-to-gutenberg.com/

## Action items for next session

Replace handoff Task 2's Playwright recovery approach with the three-layer Build+Runtime+Structural pattern. Update `specs/common-wp-styling-errors.md` row B4 accordingly.
