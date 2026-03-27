/**
 * SGS Mobile Navigation — save function.
 *
 * Hybrid block: server-rendered zones + InnerBlocks for custom content.
 * render.php handles all server-rendered output and places $content
 * (the serialised inner blocks HTML) in the custom content zone between
 * the navigation and social zones.
 *
 * @package SGS\Blocks
 */

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save() {
	return (
		<div { ...useBlockProps.save() }>
			<InnerBlocks.Content />
		</div>
	);
}
