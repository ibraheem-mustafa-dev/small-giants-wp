/**
 * Registers the SGS Floating layer block (sgs/decorative-image).
 */

import { registerBlockType } from '@wordpress/blocks';
import './style.css';
import './editor.css';
import Edit from './edit';
import save from './save';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
	save,
} );
