/**
 * Registers the SGS Modal block.
 */

import { registerBlockType } from '@wordpress/blocks';
import './style.css';
import './editor.css';
import Edit from './edit';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
} );
