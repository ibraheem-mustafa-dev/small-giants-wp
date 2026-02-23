/**
 * Registers the SGS Pricing Table block.
 */

import { registerBlockType } from '@wordpress/blocks';
import './style.css';
import './editor.css';
import Edit from './edit';
import save from './save';
import metadata from './block.json';
import deprecated from './deprecated';

registerBlockType( metadata.name, {
	edit: Edit,
	save,
	deprecated,
} );
