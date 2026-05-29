import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import metadata from './block.json';
import deprecated from './deprecated';
import './style.css';

/**
 * Dynamic block — render.php handles all frontend output.
 * save() returns null so no serialised HTML is stored.
 * deprecated.js v2 handles cross-block migration of sgs/certification-bar.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
	deprecated,
} );
