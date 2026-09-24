import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — server-rendered via render.php. The wrapper markup itself
 * is entirely rebuilt by render.php (colours, border, margin, sticky offset,
 * gallery, configurator); this save() exists only so any child blocks
 * dropped into the optional extras slot (below the add-to-cart form) are
 * serialised into post_content. render.php receives them as $content and
 * decides where they render — see render.php's ".sgs-buybox__extras" block.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
