# Detector findings — 03 — Dense panel candidates (needs ToolsPanel)

**Rule:** `03-dense-panel-candidate` (`plugins/sgs-blocks/scripts/inspector-scan/rules/03-dense-panel-candidate.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.

**Problem:** A panel has 6+ controls crammed into one flat PanelBody instead of a collapsible ToolsPanel (Spec 35 rule A5).

**Effect:** Client faces a long scroll of controls with no progressive disclosure — harder to scan, easier to miss a setting.

**Validated count:** 13 genuine finding(s)

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] Use the approved pilot as the template** — `team-member`'s "Card Settings" panel was already converted to `ToolsPanel` and Bean-approved (S7, D917). Script the remaining 13 the same way once you review that pilot.
2. Leave as tracked advisory backlog (never gates the build).

---

### sgs/trustpilot-reviews (2)
- `plugins/sgs-blocks/src/blocks/trustpilot-reviews/edit.js:466` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure
- `plugins/sgs-blocks/src/blocks/trustpilot-reviews/edit.js:548` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure

### sgs/card-grid (1)
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js:559` — PanelBody with ~8 control-like elements and no ToolsPanel progressive disclosure

### sgs/gallery (1)
- `plugins/sgs-blocks/src/blocks/gallery/edit.js:637` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure

### sgs/google-reviews (1)
- `plugins/sgs-blocks/src/blocks/google-reviews/edit.js:285` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure

### sgs/hero (1)
- `plugins/sgs-blocks/src/blocks/hero/edit.js:1116` — PanelBody with ~8 control-like elements and no ToolsPanel progressive disclosure

### sgs/mega-panel (1)
- `plugins/sgs-blocks/src/blocks/mega-panel/edit.js:399` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure

### sgs/nav-drawer (1)
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js:268` — PanelBody with ~10 control-like elements and no ToolsPanel progressive disclosure

### sgs/post-grid (1)
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js:1069` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure

### sgs/product-card (1)
- `plugins/sgs-blocks/src/blocks/product-card/edit.js:390` — PanelBody with ~9 control-like elements and no ToolsPanel progressive disclosure

### sgs/site-footer-row (1)
- `plugins/sgs-blocks/src/blocks/site-footer-row/edit.js:509` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure

### sgs/site-header-row (1)
- `plugins/sgs-blocks/src/blocks/site-header-row/edit.js:416` — PanelBody with ~7 control-like elements and no ToolsPanel progressive disclosure

### sgs/testimonial (1)
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js:595` — PanelBody with ~8 control-like elements and no ToolsPanel progressive disclosure

