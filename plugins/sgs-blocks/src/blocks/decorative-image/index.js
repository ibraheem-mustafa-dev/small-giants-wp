/**
 * Registers the SGS Decorative Image block.
 */

import { registerBlockType } from '@wordpress/blocks';
import './style.css';
import './editor.css';
import Edit from './edit';
import deprecated from './deprecated';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
	deprecated,
} );
