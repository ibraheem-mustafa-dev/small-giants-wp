---
paths:
  - "plugins/sgs-blocks/src/**"
  - "plugins/sgs-blocks/includes/**"
  - "theme/sgs-theme/**"
---

# Block authoring rules

- Full block standard: `plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard" (native `supports` for wrapper controls, custom attrs + `SgsColourPanel` for inner text, CTA controls, Block Selectors API).
- Saved defaults reach a block through five channels: Site Editor Styles (`wp_global_styles`), block patterns in `theme/sgs-theme/patterns/*.php`, the block inspector, the block's `block.json` attribute defaults, and the "Save as Default" button. That button (`src/blocks/extensions/block-defaults.js`, imported by `extensions/index.js`) POSTs the block's attributes to `/sgs-blocks/v1/defaults`; `includes/class-block-defaults.php::Block_Defaults` stores them in the `sgs_block_defaults` option, exposes them as `window.sgsBlockDefaults`, and the `blocks.registerBlockType` filter seeds them as attribute defaults for new instances. Reset is the DELETE route or Settings > SGS Block Defaults.
- An editor preview imports `ServerSideRender` from `src/components/ServerSideRender.js`, never `@wordpress/server-side-render`: core's sends every attribute in a GET URL, and the host edge drops the connection past ~11,000 characters (a large custom SVG then fails to save). Gate: `scripts/consistency/audit-ssr-http-method.js`.
- A block rendering `<img>` declares `"imageControls": true` in `block.json` `supports.sgs`, or documents why it opts out.
- Never guard a CSS fallback colour with `:not([style*="color"])` — no SGS block emits inline style, so the guard always matches. Let the value inherit, or scope the fallback inside `:where()`.
- No `deprecated.js`, no `deprecated` wired into `registerBlockType`, no block slugs added to a deprecation test, and no version bumps pre-production. The framework has no live content to migrate, and the deprecation pattern is a precedent future agents wrongly copy on every block change. When a static block's `save.js` output or a stored-attribute schema changes, just rebuild — existing dev/canary instances are re-cloned or recovered via the Site Editor's "Attempt Block Recovery". Revisit only when the framework goes to production with real client content to preserve.
- Header and footer stay WordPress template parts; one universal `header.html` and `footer.html` serve every client (Spec 37).
- When setting a default across a class of blocks, decide it per role (header, footer, page wrapper, content), never everything-on with an exclusion list.
- Never pin a WooCommerce loop to one product via `core/query` + `include:[id]` — the filter can silently swap products, and an empty gallery on the wrong product then misreports as a `sgs/buybox` bug (`buybox`, `product-card` and `Product_Manifest` are keyed purely on product ID, never on ambient loop state). Use `woocommerce/product-collection`, or pass `productId` as an explicit attribute; check `context.postId` before diagnosing an empty product block.
- An attribute `block.json` doesn't declare is invisible to the editor but still reaches `render.php`'s `$attributes` (PHP's `prepare_attributes_for_render()` does not unset it), so treat a finding as "editor can't touch this", never "dead at render"; check `render.php` before deleting. Gate: `python scripts/check-dead-pattern-attrs.py`. Never blanket-rename `textColor`→`textColour`: American spelling is correct on core blocks; scope any rename inside `wp:sgs/*` comments only.
