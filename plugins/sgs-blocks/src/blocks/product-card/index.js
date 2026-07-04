import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './style.css';

/**
 * Dynamic block — render.php handles frontend output. Typed mode renders
 * built-in elements from block attributes; there is no InnerBlocks slot.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
