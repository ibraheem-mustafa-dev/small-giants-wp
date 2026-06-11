/**
 * D8 typed-attr rebuild (2026-06-11).
 *
 * sgs/testimonial is now a TYPED dynamic block with NO InnerBlocks — render.php
 * drives 100% of the frontend output from scalar/object attributes. A dynamic
 * block with no inner blocks MUST return null from save so WordPress stores only
 * the block-delimiter comment (the attribute JSON) and lets render.php emit the
 * markup.
 *
 * MIGRATION NOTE: this REPLACES the previous FR-22-6 shape where save returned
 * <InnerBlocks.Content />. That shape is preserved as a deprecation entry (v8)
 * in deprecated.js with a migrate() that HOISTS the child-block quote/name/role
 * text back into the typed attrs and drops the children. Existing posts must be
 * round-tripped via the WP-CLI batch migrate after deploy.
 */
export default function save() {
	return null;
}
