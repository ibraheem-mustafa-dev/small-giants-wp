/**
 * FR-22-6 InnerBlocks migration — 2026-05-30.
 *
 * The slider is dynamic (render.php drives all frontend output) but now uses
 * InnerBlocks so the converter-emitted sgs/testimonial child blocks are
 * persisted in post_content. Render.php iterates $block->inner_blocks,
 * wraps each rendered child in .sgs-testimonial-slider__slide, and derives
 * the dot/arrow count from the inner block count.
 *
 * save MUST return <InnerBlocks.Content /> — never null — to prevent
 * WordPress silently dropping InnerBlocks from post_content on save.
 * (See CLAUDE.md gotcha B4.)
 *
 * The previous null-save shape is preserved as v2 in deprecated.js with a
 * migrate() that converts the testimonials array into sgs/testimonial blocks.
 */
import { InnerBlocks } from '@wordpress/block-editor';

export default function Save() {
	return <InnerBlocks.Content />;
}
