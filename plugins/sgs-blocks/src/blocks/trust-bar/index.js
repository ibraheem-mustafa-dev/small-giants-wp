import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import Edit from './edit';
import metadata from './block.json';
import deprecated from './deprecated';
import './style.css';

/**
 * Dynamic block — render.php drives all frontend output.
 *
 * save() returns <InnerBlocks.Content /> (NOT null) so that InnerBlocks children
 * are persisted to post_content in Bound mode. This is required by WP core — a
 * null save drops InnerBlocks from the serialised post on each save round-trip.
 * render.php ignores the serialised inner HTML entirely (it reads $content from
 * the parsed block) so the change has zero effect on Typed-mode rendering.
 *
 * Deprecation chain (newest-first):
 *   v4 — pre-sourceMode shape (save: () => null) → migrate adds sourceMode:'typed'.
 *   v3 — sgs/trust-badges rename alias (identity pass).
 *   v2 — sgs/certification-bar cross-block migration.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save() {
		return <InnerBlocks.Content />;
	},
	deprecated,
} );
