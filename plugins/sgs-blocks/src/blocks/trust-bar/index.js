import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import metadata from './block.json';
import './style.css';

/**
 * Dynamic block — render.php drives all frontend output.
 *
 * save() returns null: the block is typed-only (no InnerBlocks).
 * render.php renders the badge grid from items[] on every request.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
