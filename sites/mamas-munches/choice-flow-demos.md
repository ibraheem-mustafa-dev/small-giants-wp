# Mama's Munches: choice-flow demos on the canary

Canary: `sandybrown-nightingale-600381.hostingersite.com`. Governing spec: `.claude/specs/43-SGS-CHOICE-FLOW.md`. Verify each post ID exists before pointing anything at it.

- **Product:** 3990 "Classic Lactation Cookies" (`build/seed-lactation-cookies.php`).
- **Full customisation:** saved flow 4008 (`mamas-build-your-box`, showcase) in a popup on page 4012. Flow definition: `build/mamas-build-your-box.flow.json`; page tree: `build/build-your-box-page.tree.json`.
- **Product page:** product 3990 links flow 4010 (`mamas-choose-flavours`) through `_sgs_choice_flow`, so its buybox opens the flow. Flow definition: `build/mamas-choose-flavours.flow.json`.
- **Guided buybox:** page 4083. Page tree: `build/guided-buybox-page.tree.json`.
