/**
 * SGS Content Collection — block registration.
 *
 * Fully dynamic block: render.php handles all frontend output.
 * save() returns null — no InnerBlocks, no serialised HTML.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './style.css';

registerBlockType( metadata.name, {
	edit: Edit,
	/**
	 * Dynamic block — render.php owns all output.
	 * null save avoids any serialisation concerns.
	 *
	 * @return {null}
	 */
	save: () => null,
} );
