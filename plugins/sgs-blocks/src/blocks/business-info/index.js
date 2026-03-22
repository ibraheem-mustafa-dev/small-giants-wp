/**
 * Business Info Block — Registration
 *
 * @package SGS\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';

// Import frontend styles so webpack compiles them into style-index.css.
import './style.css';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null, // Dynamic block — rendered server-side via render.php.
} );
