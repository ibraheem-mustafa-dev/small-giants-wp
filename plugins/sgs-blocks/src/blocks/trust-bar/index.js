import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import metadata from './block.json';
import './style.css';

/**
 * Dynamic block — render.php drives all frontend output.
 *
 * save() returns null: the block is typed-only (no InnerBlocks).
 * render.php renders the badge grid from items[] on every request.
 *
 * Deprecation chain (newest-first):
 *   v4 — pre-WS-4-attrs shape (save: () => null) → pass-through migrate.
 *   v3 — sgs/trust-badges rename alias (identity pass).
 *   v2 — sgs/certification-bar cross-block migration.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
