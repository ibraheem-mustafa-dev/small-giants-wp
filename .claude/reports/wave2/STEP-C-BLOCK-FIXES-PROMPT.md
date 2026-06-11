---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Block-side fixes prompt — for the theme thread (product-card / card-grid session)"
created: 2026-06-10
status: READY TO SEND. Surfaced by the cloning-pipeline thread's live editor review (2026-06-10) + the step-C CSS stress test. Hands the block-side bucket to the theme thread; the converter (cloning thread) routes to the preset / mirror / child these fixes produce.
---

# Block-quality + container-mirror fixes (product-card, testimonial, notice-banner, option-picker + 2 global)

Invoke `/autopilot` first. This is block-side work surfaced by the cloning-pipeline thread's live editor review on 2026-06-10. Read `.claude/reports/wave2/FP-E-FP-H-DESIGN-GATE-2026-06-10.md`, Spec 27/28, Spec 29 (container-equivalent blocks / the `SGS_Container_Wrapper` mirror), and D192 (dead-control rule + `check-dead-controls.js`) before touching code. The goal is the best long-term outcome for the cloning pipeline, the theme, client UX, and the maintainability of both tools — not a quick patch.

## Guiding principles (Bean)

1. **The baked-in `sgs/container` mirror shares its styling with every block that bakes it in, by default.** Border, background (colour + gradient), border-radius, padding, width — available to every `wraps_block='sgs/container'` block, scoped by KIND. Styling is **never** hardcoded per-variant; every variant sets its own border/background through the mirror.
2. **Typography lives on whichever block actually renders the text — and only there.**
   - When a composite renders its text through a *child* block (hero → child `sgs/heading`), the font controls belong on that child. Do **not** duplicate typography controls on the parent composite — a duplicate is a dead control (D192).
   - When a block renders its *own* text element directly (the option-picker group label, the notice-banner body, a built-in card field), that block **must** expose the typography controls for that element.
   - Either way, every text element's font controls must be reachable in the editor and verified rendering live.
3. **`sgs/info-box` is the reference shape** — a clean child-block composite (Icon / Heading / Button-Group → Button). Bring the under-built blocks up to it.

## A. Two GLOBAL investigations + fixes (do first — they inform the per-block work)

1. **Container-mirror under-sharing.** Audit what `SGS_Container_Wrapper` / the mirror exposes to mirrored blocks vs what `sgs/container` itself supports. Border, background (colour + gradient), border-radius, padding must be available by default to every `wraps_block='sgs/container'` block, scoped by KIND. Find why they aren't and fix at the mirror level so it auto-propagates via `/sgs-update` Stage 11 — not per block. This single fix resolves the product-card hardcoded-border problem and the notice-banner under-build together.
2. **Lingering legacy "inner padding" control.** A removed control (dropdown: None / 28px / undefined px, "card body padding") still renders on product-card and many other blocks. Grep the codebase, remove it everywhere, add `deprecated.js` migrations where a stored value exists, and confirm `check-dead-controls.js` would catch any recurrence.

## B. Product-card cleanup (the block you just rebuilt)

3. **Crash:** the Advanced/SEO inspector dropdown throws "This block has encountered an error and cannot be previewed." Root-cause via `/systematic-debugging` (browser console + the editor error boundary) and fix.
4. **Legacy first-run UX:** a fresh-dragged card shows "This card uses the legacy InnerBlocks layout. Set a product name…" instead of the template. The transition bridge (D204) must not be the default editor experience — show the built-in template by default; keep the legacy path reachable only for existing page-144 content.
5. **Orphaned controls:** remove the leftover CTA text/url boxes (now in override options) — dead controls per D192.
6. **Border/background:** delete the hardcoded trial dashed-border; expose border (width/style/colour) + background (colour + gradient) via the container-mirror (per A1) so any variant — featured, trial, or a cloned card — sets its own.

## C. Option-picker

7. Add label/subheading customisation (the "Size"/"Flavour" group label — at least font size + colour, per guiding principle 2). Confirm no dead controls; verify it renders live.

## D. Testimonial — complete rework into a proper composite

8. Migrate to the `sgs/container`-mirror composite shape. Make the avatar genuinely optional — hide the slot entirely when no image is set (no empty image box). Replace the `core/paragraph` child with `sgs/text`; the quote / name / role should be child SGS blocks (or typed attrs consistent with the built-in-element model) — decide which fits the pipeline best and document why. The cloning converter routes `__text`→quote and `__author`→name into this block, so the rework must keep those destinations valid.

## E. Notice-banner — migrate to a customisable composite

9. Bake in the `sgs/container` mirror; rework the interior so it can reproduce the draft's allergen notice (custom background `#FFF5F6`, 2px primary border, radius, padding, an optional heading, list / note / secondary text). Add an optional heading slot — the cloning converter currently has to emit the `<h3>` as a sibling because notice-banner has no heading attr.

## Skills to invoke

`/autopilot` (first) · `/sgs-wp-engine` (SGS block dev) · `/systematic-debugging` (the crash, B3) · `/wp-block-development` + `/wp-interactivity-api` (block.json/edit/render/view) · `/wp-block-themes` (theme.json tokens the controls read) · `/qc-council` before each commit (multi-rater, blub.db 255) · `/visual-qa` + `/playwright` at 375/768/1440 on the live editor AND frontend · `/sgs-update` after every schema change (re-mirror + DB sync) · `/gap-analysis` before declaring done.

## Tools

Playwright MCP / superpowers-chrome for live editor verification — load each block, **select** it (inspector bugs only surface on selection), open every inspector panel, confirm no console errors, no dead controls, no legacy warnings. `/wp-blocks` + `/sgs-db` for schema before any "missing attr" claim. Sandybrown canary (`.claude/secrets/sandybrown.env`) for live verify.

## Research approach

1. Read the mirror code + Spec 29 + the D204 gate doc.
2. Audit the container-mirror's exposed surface vs `sgs/container`'s full support set (A1).
3. For the testimonial / notice-banner reworks, study how `sgs/info-box` (the good model) and the WS-4 mirror roster do it.
4. `/library-docs` for WP block supports + InnerBlocks patterns.
5. Design-gate the testimonial + notice-banner shape with Bean (R-22-13) before reworking — they are shared blocks.

## Acceptance (live-verified, R-22-11 / R-22-13)

Product-card crash gone · no legacy warning on fresh drag · zero dead controls (`check-dead-controls.js` green) · border/background settable on every variant via the mirror · the legacy inner-padding control removed everywhere with migrations · option-picker label customisable + live-rendering · testimonial avatar hideable + uses `sgs/text` + no empty-image box · notice-banner reproduces the draft allergen box with an optional heading · every text element's font controls reachable + rendering. Bean's editor eyeball on each before ship. `/sgs-update` run; commit by explicit path (theme thread shares `main`); each block its own commit.
