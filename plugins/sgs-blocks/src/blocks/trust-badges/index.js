import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import metadata from './block.json';
import './style.css';

/**
 * Dynamic block — render.php handles all frontend output.
 * save() returns null so no serialised HTML is stored.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
