---
doc_type: implementation-plan
project: small-giants-wp
spec_id: 18 (floating UI), 36+37 (merged execution track)
status: PARKED
parent_plan: .claude/plans/2026-09-21-wave-3c-implementation-plan.md (U-18 G8)
---

# G8: pin an authored block to a screen corner

## Status

Parked (Bean, 2026-09-27). lamalama's "GET IN TOUCH" card is an accepted difference for Wave 3C (DEC-18 in
`.claude/reports/reference-requirements/families-master.json::decisions`), so `M-08` counts as covered by
acceptance and this build no longer blocks Gate 3C.

**Reopen when** either: the reference-capture method in `.claude/plans/2026-09-27-reference-capture-method-plan.md`
has landed and the lamalama copy is rebuilt on it; or a client build needs a card pinned to a screen corner.

## Why the first attempt stopped

The first design lifted an in-page `sgs/container` out of the block tree and printed it at `wp_footer`. It stopped
at NO GO on 2026-09-27 on two grounds: the container wrapper has no editor branch, so `position: fixed` covers the
canvas; and a pinned container's output can carry three or more `<style>` tags, which a single front-split strands
away from the CSS collector. Full verdicts and the spec a rebuild needs: `.claude/reports/2026-09-27-u18-g6-g8-design.md`
§3, §8, §9.

## The task (run it as a fresh design gate: plan §5 steps 0-2 of the parent plan)

1. **Read first:** the parent plan's U-18 paragraph and row 12 (U-14's cautions about the floating UI renderer),
   §5 (the per-unit loop); the design report §3, §8, §9; `.claude/specs/18-SGS-FLOATING-UI.md`;
   `plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php` (`Sgs_Floating_UI_Renderer::register()` /
   `::render()`: back-to-top and reading progress).
2. **Research first** with `/research-check`.
3. **Design** from the floating UI renderer, which already prints floating UI separately at `wp_footer`: content
   authored for the floating layer and printed there, not an in-page `sgs/container` lifted out of the tree.
   The design must answer:
   - U-14's cautions: the renderer's container is `aria-hidden` (a card with a real link cannot sit inside it as
     is), and FR-36-8's priority-plus-More text contradicts reusing it unchanged.
   - Design report §9 (a) every `<style>` tag reaches the CSS collector; (b) the editor shows the card without it
     covering the canvas; (c) behaviour inside `sgs/nav-drawer` and `sgs/modal`; (d) its own z-index token, clear
     of `sgs/whatsapp-cta` (200) and `sgs/notice-banner` (1000); (e) a portal-conformance detector across the six
     `wp_footer` adopters.
4. **Exit-cell table, two-model `/qc-council`, Bean's go**, then build with `/sgs-wp-engine`, one Sonnet
   implementer per disjoint file set.

## Exit

lamalama's card is 160x326 at top 16 / right 16 at 1440 and absent at 375 and 768, measured by
`plugins/sgs-blocks/scripts/nav-qa/u18-copy-probe.mjs` (its `card` cell) and by the walker the capture-method plan
settles on; then DEC-18 is closed as built and `M-08`'s note says so.

## Guardrails

- The canary's bot challenge answers a headless browser with a 403 "Just a moment" page: run the probe headed.
- Header 3777 is live on every sandybrown page: every header swap, measure and restore happens in ONE trapped
  command ending on `qa-item-markup-fixture.php two-bar` (`plugins/sgs-blocks/scripts/nav-qa/README.md` §13).
- `build-deploy.py`'s HTTPS purge and verify legs report ERROR while the files are live: verify by checksum over
  SSH and run `wp litespeed-purge all` by hand.
