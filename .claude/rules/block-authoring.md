---
paths:
  - "plugins/sgs-blocks/src/**"
  - "plugins/sgs-blocks/includes/**"
  - "theme/sgs-theme/**"
---

# Block authoring rules

- Full block standard: `plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard" (native `supports` for wrapper controls, custom attrs + `SgsColourPanel` for inner text, CTA controls, Block Selectors API).
- Saved defaults use four WordPress-native channels only: Site Editor Styles (`wp_global_styles`), block patterns in `theme/sgs-theme/patterns/*.php`, the `useLastUsedAttributes` session hook, and the block inspector. No `withSaveAsDefault` HOC, no defaults panel, no `wp_options` defaults store.
- A block rendering `<img>` declares `"imageControls": true` in `block.json` `supports.sgs`, or documents why it opts out.
- Never guard a CSS fallback colour with `:not([style*="color"])` — no SGS block emits inline style, so the guard always matches. Let the value inherit, or scope the fallback inside `:where()`.
- No version bumps and no block deprecations pre-production.
- Header and footer stay WordPress template parts (Spec 37); only the specialised containers (`site-header`, `site-footer`, `nav-bar-menu`, `nav-drawer-menu`, `nav-drawer`) exist as blocks.
