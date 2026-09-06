# Detector findings — 31 — Golden colour control (hover state / gradient sibling)

**Rule:** `31-golden-colour-control` (`plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.

**Problem:** A colour row is missing its required hover state and/or gradient sibling (golden-controls.json's own conformance spec: every colour control needs 2 states minimum, or a gradient companion).

**Effect:** Client can set a base colour but can't set the matching hover colour or gradient for the same element — an inconsistent, half-finished-looking control.

**Validated count:** 277 genuine finding(s)

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu (D752/D754-settled — do not re-litigate the scope, only the sequencing):**
1. **[Recommended] Run `colour-codemod/fix.js --fix --apply`** — auto-fixes what it can (last session: 25 of 178 non-conformant rows, 14%, were mechanically fixable; 3 landed).
2. **The bulk of what remains (D754) needs a capability-grant pass FIRST** — most rows can't paint hover/gradient without `render.php` gaining a real selector/mechanism. Design: `.claude/plans/archive/2026-08-23-colour-capability-grant-design.md` (archived at 51deda006). Superseded by the staged rollout plan -- the codemod route was returned NO-GO by a 6-persona adversarial council on 2026-09-03; ship existing-tooling value first, decide on a codemod after measuring real per-block cost.
3. Leave as accepted, actively-worked debt (D752 ruling stands).

**Grouped by shape below** — `below-min-states` (150) needs a hover-state row added; `missing-gradient` (127) needs a gradient sibling added.

---

## Below minimum states (needs a hover row) — 150

### sgs/post-grid (8)
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:481` — colour row "title" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:494` — colour row "excerpt" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:507` — colour row "meta" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:520` — colour row "category-badge-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:533` — colour row "category-badge-bg" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:546` — colour row "read-more" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:559` — colour row "text-hover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:572` — colour row "border-hover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/pricing-table (8)
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:252` — colour row "title" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:265` — colour row "price" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:281` — colour row "feature" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:294` — colour row "cta-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:307` — colour row "cta-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:320` — colour row "badge-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:333` — colour row "badge-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:687` — colour row "plan-ribbon-colour" carries 0 states, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/product-card (7)
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1053` — colour row "title" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1066` — colour row "description" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1079` — colour row "price" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1092` — colour row "priceNote" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1107` — colour row "tagBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1120` — colour row "tagText" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1201` — colour row "pickerLabel" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/testimonial (7)
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:383` — colour row "border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:426` — colour row "summary" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:440` — colour row "name" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:454` — colour row "role" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:468` — colour row "org" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:484` — colour row "rating" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:498` — colour row "shadowHover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/timeline (7)
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:629` — colour row "wrapperText" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:650` — colour row "wrapperBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:678` — colour row "rowStripeA" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:692` — colour row "rowStripeB" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:708` — colour row "connector" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:721` — colour row "connectorFill" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:735` — colour row "date" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/mega-panel (6)
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:297` — colour row "background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:310` — colour row "border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:326` — colour row "iconBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:368` — colour row "iconColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:382` — colour row "accentBackgroundImage" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:603` — colour row "aside-separator-colour" carries 0 states, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/before-after (5)
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:457` — colour row "labelText" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:469` — colour row "labelBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:481` — colour row "divider" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:493` — colour row "handle" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:505` — colour row "handleIcon" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/business-info (5)
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:74` — colour row "icon" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:89` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:101` — colour row "label" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:113` — colour row "link-hover-sweep" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:125` — colour row "link-hover-fallback" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/cart (5)
- `plugins/sgs-blocks/src/blocks/cart/edit.js:74` — colour row "icon" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/cart/edit.js:90` — colour row "badgeBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/cart/edit.js:103` — colour row "badgeText" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/cart/edit.js:116` — colour row "panelBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/cart/edit.js:129` — colour row "panelText" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/nav-menu (5)
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:511` — colour row "nav-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:624` — colour row "burger-icon" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:657` — colour row "indicator" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:670` — colour row "submenu-bg" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:683` — colour row "submenu-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/product-search (5)
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:72` — colour row "input-border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:87` — colour row "focus-ring" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:102` — colour row "listbox-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:117` — colour row "result-hover-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:135` — colour row "match-highlight" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/form (4)
- `plugins/sgs-blocks/src/blocks/form/edit.js:120` — colour row "submit-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/form/edit.js:133` — colour row "submit-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/form/edit.js:146` — colour row "progress-bar" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/form/edit.js:159` — colour row "focus-ring" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/modal (4)
- `plugins/sgs-blocks/src/blocks/modal/edit.js:125` — colour row "triggerText" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/modal/edit.js:138` — colour row "triggerBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/modal/edit.js:151` — colour row "modalBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/modal/edit.js:164` — colour row "overlay" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/tabs (4)
- `plugins/sgs-blocks/src/blocks/tabs/edit.js:205` — colour row "tab-text" carries 2 states, below the required 3 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/tabs/edit.js:225` — colour row "tab-indicator" carries 2 states, below the required 3 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/tabs/edit.js:251` — colour row "panel-bg" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/tabs/edit.js:264` — colour row "panel-border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/trust-bar (4)
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:186` — colour row "fill-colour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:536` — colour row "icon-circle-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:580` — colour row "title-colour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:593` — colour row "label-colour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/accordion (3)
- `plugins/sgs-blocks/src/blocks/accordion/edit.js:118` — colour row "headerText" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/accordion/edit.js:130` — colour row "headerBackground" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/accordion/edit.js:142` — colour row "icon" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/breadcrumbs (3)
- `plugins/sgs-blocks/src/blocks/breadcrumbs/edit.js:89` — colour row "link" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/breadcrumbs/edit.js:101` — colour row "separator" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/breadcrumbs/edit.js:113` — colour row "current" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/card-grid (3)
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js:370` — colour row "title" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js:383` — colour row "subtitle" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js:448` — colour row "card-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/filter-search (3)
- `plugins/sgs-blocks/src/blocks/filter-search/edit.js:31` — colour row "inputBorder" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/filter-search/edit.js:47` — colour row "focusRing" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/filter-search/edit.js:60` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/gallery (3)
- `plugins/sgs-blocks/src/blocks/gallery/edit.js:335` — colour row "caption-text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/gallery/edit.js:348` — colour row "caption-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/gallery/edit.js:361` — colour row "overlay" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/multi-button (3)
- `plugins/sgs-blocks/src/blocks/multi-button/edit.js:230` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/multi-button/edit.js:244` — colour row "child-btn-background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/multi-button/edit.js:251` — colour row "child-btn-text-colour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/process-steps (3)
- `plugins/sgs-blocks/src/blocks/process-steps/edit.js:263` — colour row "number" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/process-steps/edit.js:287` — colour row "title" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/process-steps/edit.js:300` — colour row "description" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/quote (3)
- `plugins/sgs-blocks/src/blocks/quote/edit.js:334` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/quote/edit.js:379` — colour row "textColourHover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/quote/edit.js:392` — colour row "attributionColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/social-icons (3)
- `plugins/sgs-blocks/src/blocks/social-icons/edit.js:335` — colour row "icon-bg-hover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/social-icons/edit.js:348` — colour row "icon-border-hover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/social-icons/edit.js:363` — colour row "icon-glyph-hover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/audio (2)
- `plugins/sgs-blocks/src/blocks/audio/edit.js:95` — colour row "accent" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/audio/edit.js:107` — colour row "spectrum" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/countdown-timer (2)
- `plugins/sgs-blocks/src/blocks/countdown-timer/edit.js:145` — colour row "number" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/countdown-timer/edit.js:160` — colour row "label" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/counter (2)
- `plugins/sgs-blocks/src/blocks/counter/edit.js:100` — colour row "number" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/counter/edit.js:116` — colour row "label" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/info-box (2)
- `plugins/sgs-blocks/src/blocks/info-box/edit.js:456` — colour row "border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/info-box/edit.js:472` — colour row "shadowHover" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/label (2)
- `plugins/sgs-blocks/src/blocks/label/edit.js:249` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/label/edit.js:265` — colour row "background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/mega-aside (2)
- `plugins/sgs-blocks/src/blocks/mega-aside/edit.js:153` — colour row "background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/mega-aside/edit.js:166` — colour row "border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/nav-drawer (2)
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js:234` — colour row "drawerBg" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js:244` — colour row "drawerTextColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/separator (2)
- `plugins/sgs-blocks/src/blocks/separator/edit.js:278` — colour row "colour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/separator/edit.js:291` — colour row "contentColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/star-rating (2)
- `plugins/sgs-blocks/src/blocks/star-rating/edit.js:148` — colour row "starColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/star-rating/edit.js:161` — colour row "emptyColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/team-member (2)
- `plugins/sgs-blocks/src/blocks/team-member/edit.js:375` — colour row "nameColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/team-member/edit.js:388` — colour row "roleColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/whatsapp-cta (2)
- `plugins/sgs-blocks/src/blocks/whatsapp-cta/edit.js:99` — colour row "label" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).
- `plugins/sgs-blocks/src/blocks/whatsapp-cta/edit.js:112` — colour row "background" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/accordion-item (1)
- `plugins/sgs-blocks/src/blocks/accordion-item/edit.js:137` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/collapsible-text (1)
- `plugins/sgs-blocks/src/blocks/collapsible-text/edit.js:45` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/cta-section (1)
- `plugins/sgs-blocks/src/blocks/cta-section/edit.js:324` — colour row "hover-border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/feature-grid (1)
- `plugins/sgs-blocks/src/blocks/feature-grid/edit.js:161` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/form-field-tiles (1)
- `plugins/sgs-blocks/src/blocks/form-field-tiles/edit.js:96` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/form-step (1)
- `plugins/sgs-blocks/src/blocks/form-step/edit.js:45` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/google-reviews (1)
- `plugins/sgs-blocks/src/blocks/google-reviews/edit.js:74` — colour row "star" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/media (1)
- `plugins/sgs-blocks/src/blocks/media/edit.js:159` — colour row "caption" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/option-picker (1)
- `plugins/sgs-blocks/src/blocks/option-picker/edit.js:335` — colour row "label" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/product-faq (1)
- `plugins/sgs-blocks/src/blocks/product-faq/edit.js:182` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/product-faq-item (1)
- `plugins/sgs-blocks/src/blocks/product-faq-item/edit.js:180` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/site-footer-row (1)
- `plugins/sgs-blocks/src/blocks/site-footer-row/edit.js:330` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/site-header-row (1)
- `plugins/sgs-blocks/src/blocks/site-header-row/edit.js:307` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/tab (1)
- `plugins/sgs-blocks/src/blocks/tab/edit.js:116` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/table-of-contents (1)
- `plugins/sgs-blocks/src/blocks/table-of-contents/edit.js:216` — colour row "titleColour" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/testimonial-slider (1)
- `plugins/sgs-blocks/src/blocks/testimonial-slider/edit.js:166` — colour row "border" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

### sgs/trustpilot-reviews (1)
- `plugins/sgs-blocks/src/blocks/trustpilot-reviews/edit.js:200` — colour row "text" carries 1 state, below the required 2 (golden-controls.json controls.colour.states — minimum 2, or 1 + the states declared on this attribute's matching supports.sgs.elements entry).

## Missing gradient sibling — 127

### sgs/product-card (11)
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1053` — colour row "title" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1066` — colour row "description" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1079` — colour row "price" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1092` — colour row "priceNote" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1107` — colour row "tagBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1120` — colour row "tagText" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1135` — colour row "ctaBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1201` — colour row "pickerLabel" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1214` — colour row "pickerPillBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1234` — colour row "pickerPillText" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:1254` — colour row "pickerPillBorder" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/nav-menu (9)
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:544` — colour row "item-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:564` — colour row "underline" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:584` — colour row "featured-text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:604` — colour row "featured-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill/text, from css_property "background-color,color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:624` — colour row "burger-icon" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:637` — colour row "burger-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:657` — colour row "indicator" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:670` — colour row "submenu-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js:683` — colour row "submenu-text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/post-grid (8)
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:461` — colour row "card-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:481` — colour row "title" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:494` — colour row "excerpt" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:507` — colour row "meta" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:533` — colour row "category-badge-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:546` — colour row "read-more" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:559` — colour row "text-hover" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:572` — colour row "border-hover" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: border, from css_property "border-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/timeline (7)
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:629` — colour row "wrapperText" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:650` — colour row "wrapperBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:678` — colour row "rowStripeA" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:692` — colour row "rowStripeB" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:708` — colour row "connector" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:721` — colour row "connectorFill" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: stroke, from css_property "stroke") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/timeline/edit.js:735` — colour row "date" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/before-after (5)
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:457` — colour row "labelText" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:469` — colour row "labelBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:481` — colour row "divider" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:493` — colour row "handle" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/before-after/edit.js:505` — colour row "handleIcon" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: stroke, from css_property "stroke") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/pricing-table (5)
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:252` — colour row "title" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:281` — colour row "feature" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:307` — colour row "cta-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:333` — colour row "badge-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js:687` — colour row "plan-ribbon-colour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/product-search (5)
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:72` — colour row "input-border" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: border, from css_property "border-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:87` — colour row "focus-ring" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: border, from css_property "outline-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:102` — colour row "listbox-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:117` — colour row "result-hover-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/product-search/edit.js:135` — colour row "match-highlight" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/testimonial (5)
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:426` — colour row "summary" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:440` — colour row "name" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:454` — colour row "role" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:468` — colour row "org" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:484` — colour row "rating" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/business-info (4)
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:89` — colour row "text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:101` — colour row "label" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:113` — colour row "link-hover-sweep" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-image") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/business-info/edit.js:125` — colour row "link-hover-fallback" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/form (4)
- `plugins/sgs-blocks/src/blocks/form/edit.js:120` — colour row "submit-text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/form/edit.js:133` — colour row "submit-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/form/edit.js:146` — colour row "progress-bar" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/form/edit.js:159` — colour row "focus-ring" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: border, from css_property "border-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/mega-panel (4)
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:297` — colour row "background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:326` — colour row "iconBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:382` — colour row "accentBackgroundImage" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-image") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:603` — colour row "aside-separator-colour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/modal (4)
- `plugins/sgs-blocks/src/blocks/modal/edit.js:125` — colour row "triggerText" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/modal/edit.js:138` — colour row "triggerBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/modal/edit.js:151` — colour row "modalBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/modal/edit.js:164` — colour row "overlay" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/trust-bar (4)
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:186` — colour row "fill-colour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:536` — colour row "icon-circle-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:580` — colour row "title-colour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js:593` — colour row "label-colour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/breadcrumbs (3)
- `plugins/sgs-blocks/src/blocks/breadcrumbs/edit.js:89` — colour row "link" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/breadcrumbs/edit.js:101` — colour row "separator" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/breadcrumbs/edit.js:113` — colour row "current" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/card-grid (3)
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js:370` — colour row "title" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js:383` — colour row "subtitle" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js:448` — colour row "card-text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/gallery (3)
- `plugins/sgs-blocks/src/blocks/gallery/edit.js:335` — colour row "caption-text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/gallery/edit.js:348` — colour row "caption-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/gallery/edit.js:361` — colour row "overlay" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/option-picker (3)
- `plugins/sgs-blocks/src/blocks/option-picker/edit.js:335` — colour row "label" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/option-picker/edit.js:348` — colour row "pillBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/option-picker/edit.js:368` — colour row "pillText" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/process-steps (3)
- `plugins/sgs-blocks/src/blocks/process-steps/edit.js:287` — colour row "title" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/process-steps/edit.js:300` — colour row "description" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/process-steps/edit.js:333` — colour row "wrapperBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/quote (3)
- `plugins/sgs-blocks/src/blocks/quote/edit.js:334` — colour row "text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/quote/edit.js:379` — colour row "textColourHover" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/quote/edit.js:392` — colour row "attributionColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/audio (2)
- `plugins/sgs-blocks/src/blocks/audio/edit.js:95` — colour row "accent" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/audio/edit.js:107` — colour row "spectrum" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/brand-strip (2)
- `plugins/sgs-blocks/src/blocks/brand-strip/edit.js:383` — colour row "tileBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/brand-strip/edit.js:425` — colour row "caption" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/cart (2)
- `plugins/sgs-blocks/src/blocks/cart/edit.js:90` — colour row "badgeBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/cart/edit.js:116` — colour row "panelBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/filter-search (2)
- `plugins/sgs-blocks/src/blocks/filter-search/edit.js:47` — colour row "focusRing" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: border, from css_property "outline-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/filter-search/edit.js:60` — colour row "text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/multi-button (2)
- `plugins/sgs-blocks/src/blocks/multi-button/edit.js:244` — colour row "child-btn-background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/multi-button/edit.js:251` — colour row "child-btn-text-colour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute) (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/separator (2)
- `plugins/sgs-blocks/src/blocks/separator/edit.js:278` — colour row "colour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: border, from css_property "border-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/separator/edit.js:291` — colour row "contentColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/social-icons (2)
- `plugins/sgs-blocks/src/blocks/social-icons/edit.js:262` — colour row "icon-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/social-icons/edit.js:335` — colour row "icon-bg-hover" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/star-rating (2)
- `plugins/sgs-blocks/src/blocks/star-rating/edit.js:148` — colour row "starColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "fill") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/star-rating/edit.js:161` — colour row "emptyColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "fill") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/table-of-contents (2)
- `plugins/sgs-blocks/src/blocks/table-of-contents/edit.js:196` — colour row "linkColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/table-of-contents/edit.js:216` — colour row "titleColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/tabs (2)
- `plugins/sgs-blocks/src/blocks/tabs/edit.js:178` — colour row "tab-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/tabs/edit.js:251` — colour row "panel-bg" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/team-member (2)
- `plugins/sgs-blocks/src/blocks/team-member/edit.js:375` — colour row "nameColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/team-member/edit.js:388` — colour row "roleColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/whatsapp-cta (2)
- `plugins/sgs-blocks/src/blocks/whatsapp-cta/edit.js:99` — colour row "label" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).
- `plugins/sgs-blocks/src/blocks/whatsapp-cta/edit.js:112` — colour row "background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/accordion (1)
- `plugins/sgs-blocks/src/blocks/accordion/edit.js:130` — colour row "headerBackground" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/collapsible-text (1)
- `plugins/sgs-blocks/src/blocks/collapsible-text/edit.js:45` — colour row "text" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/countdown-timer (1)
- `plugins/sgs-blocks/src/blocks/countdown-timer/edit.js:160` — colour row "label" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/counter (1)
- `plugins/sgs-blocks/src/blocks/counter/edit.js:116` — colour row "label" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/google-reviews (1)
- `plugins/sgs-blocks/src/blocks/google-reviews/edit.js:74` — colour row "star" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "fill") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/icon (1)
- `plugins/sgs-blocks/src/blocks/icon/edit.js:253` — colour row "background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/label (1)
- `plugins/sgs-blocks/src/blocks/label/edit.js:265` — colour row "background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/media (1)
- `plugins/sgs-blocks/src/blocks/media/edit.js:159` — colour row "caption" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/mega-aside (1)
- `plugins/sgs-blocks/src/blocks/mega-aside/edit.js:153` — colour row "background" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: fill, from css_property "background-color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

### sgs/nav-drawer (1)
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js:254` — colour row "toggleCloseColour" has no gradient path (no gradientValue/onGradientChange on any state, and no gradientCapable:true) and no declared exemption (resolved mechanism: text, from css_property "color") (golden-controls.json controls.colour.gradient — required, with declared exemptions).

