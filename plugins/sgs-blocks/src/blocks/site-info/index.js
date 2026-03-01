/**
 * SGS Site Info — block registration.
 *
 * Dynamic block: all output is handled server-side in render.php.
 * The edit component uses ServerSideRender for a live preview.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null, // Dynamic block — render.php handles all output.
} );
