# Detector findings — 01 — Tab-group placement (Settings vs Styles routing)

**Rule:** `01-tab-group` (`plugins/sgs-blocks/scripts/inspector-scan/rules/01-tab-group.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.

**Problem:** A block's inspector panels don't declare which WP tab (Settings/Styles) they belong to — everything defaults into one tab instead of following THE PLACEMENT RULE (Spec 35, D537: one panel per element).

**Effect:** Client sees a wall of undifferentiated panels instead of organised Settings/Styles/element-based grouping — harder to find the right control.

**Validated count:** 57 genuine finding(s)

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] Bulk-fix per element** — for each flagged block, group panels per THE PLACEMENT RULE (Spec 35 Part O) rather than block-by-block guessing.
2. Leave as tracked advisory backlog (never gates the build).

⚠ Note from validation: this rule only checks for a `group=` prop's *presence*, not real TIER 1/2 restructuring — a superficial fix could clear a finding without actually reorganising panels. Verify any 'fixed' block by eye, not just by re-running the rule.

---

### sgs/accordion (1)
- `plugins/sgs-blocks/src/blocks/accordion/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/audio (1)
- `plugins/sgs-blocks/src/blocks/audio/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/breadcrumbs (1)
- `plugins/sgs-blocks/src/blocks/breadcrumbs/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/business-info (1)
- `plugins/sgs-blocks/src/blocks/business-info/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/buybox (1)
- `plugins/sgs-blocks/src/blocks/buybox/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/card-grid (1)
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/cart (1)
- `plugins/sgs-blocks/src/blocks/cart/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/collapsible-text (1)
- `plugins/sgs-blocks/src/blocks/collapsible-text/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/countdown-timer (1)
- `plugins/sgs-blocks/src/blocks/countdown-timer/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/counter (1)
- `plugins/sgs-blocks/src/blocks/counter/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/feature-grid (1)
- `plugins/sgs-blocks/src/blocks/feature-grid/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/filter-search (1)
- `plugins/sgs-blocks/src/blocks/filter-search/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form (1)
- `plugins/sgs-blocks/src/blocks/form/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-address (1)
- `plugins/sgs-blocks/src/blocks/form-field-address/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-checkbox (1)
- `plugins/sgs-blocks/src/blocks/form-field-checkbox/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-date (1)
- `plugins/sgs-blocks/src/blocks/form-field-date/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-file (1)
- `plugins/sgs-blocks/src/blocks/form-field-file/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-number (1)
- `plugins/sgs-blocks/src/blocks/form-field-number/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-radio (1)
- `plugins/sgs-blocks/src/blocks/form-field-radio/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-select (1)
- `plugins/sgs-blocks/src/blocks/form-field-select/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-field-tiles (1)
- `plugins/sgs-blocks/src/blocks/form-field-tiles/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/form-step (1)
- `plugins/sgs-blocks/src/blocks/form-step/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/gallery (1)
- `plugins/sgs-blocks/src/blocks/gallery/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/google-reviews (1)
- `plugins/sgs-blocks/src/blocks/google-reviews/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/heading (1)
- `plugins/sgs-blocks/src/blocks/heading/edit.js` — Settings/Styles are not routed, everything defaults to one tab. (Advanced is already routed via InspectorAdvancedControls, not counted above.)

### sgs/icon (1)
- `plugins/sgs-blocks/src/blocks/icon/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/icon-list (1)
- `plugins/sgs-blocks/src/blocks/icon-list/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/image-sequence (1)
- `plugins/sgs-blocks/src/blocks/image-sequence/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/label (1)
- `plugins/sgs-blocks/src/blocks/label/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/media (1)
- `plugins/sgs-blocks/src/blocks/media/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/mega-aside (1)
- `plugins/sgs-blocks/src/blocks/mega-aside/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/mega-panel (1)
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/modal (1)
- `plugins/sgs-blocks/src/blocks/modal/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/multi-button (1)
- `plugins/sgs-blocks/src/blocks/multi-button/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/notice-banner (1)
- `plugins/sgs-blocks/src/blocks/notice-banner/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/post-grid (1)
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/pricing-table (1)
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/process-steps (1)
- `plugins/sgs-blocks/src/blocks/process-steps/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/product-faq (1)
- `plugins/sgs-blocks/src/blocks/product-faq/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/product-faq-item (1)
- `plugins/sgs-blocks/src/blocks/product-faq-item/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/product-search (1)
- `plugins/sgs-blocks/src/blocks/product-search/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/quote (1)
- `plugins/sgs-blocks/src/blocks/quote/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/responsive-logo (1)
- `plugins/sgs-blocks/src/blocks/responsive-logo/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/separator (1)
- `plugins/sgs-blocks/src/blocks/separator/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/site-footer-row (1)
- `plugins/sgs-blocks/src/blocks/site-footer-row/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/site-header-row (1)
- `plugins/sgs-blocks/src/blocks/site-header-row/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/social-icons (1)
- `plugins/sgs-blocks/src/blocks/social-icons/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/star-rating (1)
- `plugins/sgs-blocks/src/blocks/star-rating/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/tab (1)
- `plugins/sgs-blocks/src/blocks/tab/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/table-of-contents (1)
- `plugins/sgs-blocks/src/blocks/table-of-contents/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/tabs (1)
- `plugins/sgs-blocks/src/blocks/tabs/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/team-member (1)
- `plugins/sgs-blocks/src/blocks/team-member/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/testimonial-slider (1)
- `plugins/sgs-blocks/src/blocks/testimonial-slider/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/text (1)
- `plugins/sgs-blocks/src/blocks/text/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/timeline (1)
- `plugins/sgs-blocks/src/blocks/timeline/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/trustpilot-reviews (1)
- `plugins/sgs-blocks/src/blocks/trustpilot-reviews/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

### sgs/whatsapp-cta (1)
- `plugins/sgs-blocks/src/blocks/whatsapp-cta/edit.js` — Settings/Styles are not routed, everything defaults to one tab.

