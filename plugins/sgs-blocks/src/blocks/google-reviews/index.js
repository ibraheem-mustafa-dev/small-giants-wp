/**
 * Google Reviews — Block Registration
 *
 * @package SGS\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import './editor.css';
import './style.css';

registerBlockType( metadata.name, {
	edit,
	// Uses dynamic rendering via render.php.
} );
