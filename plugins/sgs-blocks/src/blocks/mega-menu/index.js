/**
 * Mega Menu block registration.
 *
 * @package SGS\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import metadata from './block.json';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	...metadata,
	edit: Edit,
	save: () => null, // Dynamic block
} );
