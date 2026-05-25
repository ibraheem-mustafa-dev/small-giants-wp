/**
 * save.js — sgs/quote is dynamic (server-rendered via render.php), but it now
 * also accepts InnerBlocks (Phase 1H, 2026-05-25) so the deterministic converter
 * v2 F1 universal-nesting path (Spec 16 §15 line 990) can emit nested children.
 *
 * For dynamic blocks with an InnerBlocks slot we MUST return <InnerBlocks.Content />,
 * NOT null. Returning null causes WordPress to drop the inner blocks from
 * post_content during the editor save round-trip — the editor still shows them
 * in memory but the database loses them. render.php still drives 100% of
 * frontend output; save's only job here is to emit the InnerBlocks marker so
 * those children survive the save round-trip.
 *
 * Pattern reference: SGS Blocks CLAUDE.md gotcha "Dynamic blocks with
 * InnerBlocks slots MUST `save: () => <InnerBlocks.Content />`" — caught 2026-05-04
 * in product-card / cta-section / info-box. common-wp-styling-errors.md row B4.
 */
import { InnerBlocks } from '@wordpress/block-editor';

export default function Save() {
	return <InnerBlocks.Content />;
}
