# Track W8 (label w8-content; plan Task 13): cards, reviews, media, gallery and lists of items

Stage E3. Read `_common.md`, then `w-e3-shared.md` (base branch, two passes, what every owner applies, done when), then this. Port 8111. Evidence: `i24-register` (`register.md`) for your blocks; `i20-moves2.md` sections 3 and 4c; `i23-details.md` sections 4 and 6; `i11-editor-ui.md` section 6; W3's report (`E:\sgs-tmp\general-cloning\build\w3-switcher\REPORT.md`, carousels).

**Your blocks:** card-grid, feature-grid, post-grid, info-box, team-member, testimonial, testimonial-slider, google-reviews, google-rating-badge, trustpilot-reviews, star-rating, gallery, brand-strip, image-sequence, media, before-after, trust-bar, process-steps, timeline, counter, pricing-table, countdown-timer, decorative-image, audio, physics-canvas, measured-diagram, diagram-dimension, local-time.

**Over 12 base colours (2026-11-25 count; W5's detector list wins):** google-reviews 39, timeline 19, post-grid 17, and any others W5's list names in your set.

**Shared files you own:** none. The trust bar's lean layout is W4's and already merged; apply only the register rows for it.

1. **Gallery** (Bean, 2026-11-25, decision A): the Styles "Layout" panel dissolves into the shared Spacing panel (gap, padding, margin, widths; gallery passes Max width and Content width) and the shared Border panel (the wrapper border). The Settings "Layout" panel (layout type, columns, items shown) stays. Every attribute keeps its name.
2. **Google reviews** (Bean, 2026-11-25): the theme choice (light, dark, transparent) gets its own "Style" panel at the top of the Styles tab, above Colour. The layout choice joins "Display Options" (register). "Add review" does not go to "Slider Settings", which renders only for the slider (`i20-moves2.md` section 1); place it per the register's correction. Its colours go to part panels (over 12). The dots keep their own panel and CSS (W3's report, "Not done"): do not move them.
3. **Look controls and renames** (`i20-moves2.md` section 3, the register's "Cases" table): brand-strip "Image effect" into "Overlay and filters"; counter "Accent underline stroke" into "Counter Settings"; process-steps and timeline "Lift on hover" stay in "Shadow on hover"; timeline "Scroll reveal" becomes "Scroll motion"; testimonial "Layout variant" becomes "Testimonial"; image-sequence "Responsive frame sources" becomes "Frame sources" and its frame-folder panels merge; link underline goes to Colour; heading levels go to the title element's panel (card-grid Title, timeline Entry title).
4. **Register and repeated titles** for every block above (`w-e3-shared.md` items 1 to 3). card-grid keeps "Card spacing".
5. **Layout and width preview:** google-reviews, post-grid and trustpilot-reviews import no shared canvas mirror (`i11-editor-ui.md` section 6); adopt `containerWrapperPreview` so their canvas follows the panel.

The Typography and motion target lists move onto the shared element switcher in W9 (one shared change plus a codemod of every block's hand-written `targets` prop, yours included): leave those `targets` props alone.

Done when: `w-e3-shared.md`'s list for your blocks, plus screenshots of gallery's Styles tab and google-reviews' Styles tab.
