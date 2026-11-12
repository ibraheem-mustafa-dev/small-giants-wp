---
paths:
  - "plugins/sgs-blocks/src/**"
  - "plugins/sgs-blocks/includes/**"
  - "theme/sgs-theme/**"
---

# Block authoring rules

- Full block standard: `plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard" (native `supports` for wrapper controls, custom attrs + `SgsColourPanel` for inner text, CTA controls, Block Selectors API).
- Saved defaults reach a block through Site Editor Styles (`wp_global_styles`), theme patterns (`theme/sgs-theme/patterns/*.php`), the inspector, `block.json` attribute defaults and the "Save as Default" button. That button (`src/blocks/extensions/block-defaults.js`) POSTs to `/sgs-blocks/v1/defaults`; `includes/class-block-defaults.php::Block_Defaults` stores it in `sgs_block_defaults` and the `blocks.registerBlockType` filter makes it the initial attributes of newly inserted blocks only, so existing blocks keep previewing and rendering `block.json`'s defaults. Reset is the DELETE route or Settings > SGS Block Defaults.
- An editor preview imports `ServerSideRender` from `src/components/ServerSideRender.js`, never `@wordpress/server-side-render`: core's sends every attribute in a GET URL, and the host edge drops the connection past ~11,000 characters (a large custom SVG then fails to save). Gate: `scripts/consistency/audit-ssr-http-method.js`.
- A block that shows media (an image, video, SVG, embed or background) declares a slot in `block.json::supports.sgs.mediaElements` (prefix, kinds, context content, background, item or layer, optional narrowed atoms) and prints it with `SGS_Media_Element::render( $slot, $attrs, $context )`; it never hand-rolls an `<img>`, a `MediaUpload` or a focal field. `plugins/sgs-blocks/scripts/generate-media-attributes.mjs --block <slug>` writes the slot's attributes into `block.json`; `plugins/sgs-blocks/scripts/check-media-contract.py` is the gate.
- Never guard a CSS fallback colour with `:not([style*="color"])` — no SGS block emits inline style, so the guard always matches. Let the value inherit, or scope the fallback inside `:where()`.
- No `deprecated.js`, no `deprecated` in `registerBlockType`, no deprecation-test slugs and no version bumps pre-production: there is no live content to migrate, and the pattern is a precedent future agents wrongly copy on every block change. When `save.js` output or a stored-attribute schema changes, rebuild; dev/canary instances are re-cloned or recovered via the Site Editor's "Attempt Block Recovery". Revisit when the framework goes to production with real client content.
- Header and footer stay WordPress template parts; one universal `header.html` and `footer.html` serve every client (Spec 37).
- When setting a default across a class of blocks, decide it per role (header, footer, page wrapper, content), never everything-on with an exclusion list (exclusion lists rot as blocks are added).
- Never pin a WooCommerce loop to one product via `core/query` + `include:[id]`: the filter can silently swap products, and the empty gallery on the wrong product then misreports as a `sgs/buybox` bug (`buybox`, `product-card` and `Product_Manifest` key purely on product ID). Use `woocommerce/product-collection`, or pass `productId` as an explicit attribute.
- An attribute `block.json` doesn't declare is invisible to the editor but still reaches `render.php`'s `$attributes`, so read a finding as "editor can't touch this", never "dead at render"; check `render.php` before deleting. Gate: `python scripts/check-dead-pattern-attrs.py`. Never blanket-rename `textColor` to `textColour` (American spelling is correct on core blocks); scope any rename inside `wp:sgs/*` comments only.
