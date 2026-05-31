/**
 * FR-22-6 InnerBlocks migration — 2026-05-30.
 *
 * The block is dynamic (render.php drives frontend output) but NOW uses
 * InnerBlocks so the converter-emitted child blocks (sgs/star-rating,
 * sgs/text, etc.) are persisted in post_content and rendered by
 * render.php via echo $content.
 *
 * IMPORTANT: save MUST return <InnerBlocks.Content /> — never null — when
 * the block has InnerBlocks. Returning null causes WordPress to silently
 * drop all InnerBlocks from post_content on save. (See CLAUDE.md gotcha B4.)
 *
 * The previous null-save shape is preserved as v7 in deprecated.js with a
 * migrate() that creates InnerBlocks from the old scalar attrs.
 */
import { InnerBlocks } from '@wordpress/block-editor';

export default function Save() {
	return <InnerBlocks.Content />;
}
