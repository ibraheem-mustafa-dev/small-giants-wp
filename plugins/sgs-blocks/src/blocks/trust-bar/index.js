import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import metadata from './block.json';
import deprecated from './deprecated';
import './style.css';

/**
 * Dynamic block — render.php handles all frontend output.
 * save() returns null so no serialised HTML is stored.
 * deprecated.js v3 handles rename alias sgs/trust-badges → sgs/trust-bar.
 * deprecated.js v2 handles cross-block migration of sgs/certification-bar → sgs/trust-bar.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
	deprecated,
} );
