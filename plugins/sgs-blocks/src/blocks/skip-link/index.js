/**
 * SGS Skip Link block.
 *
 * @since 1.0.0
 * @package SGS\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import { skipLinkIcon } from '../../utils/icons';

registerBlockType( metadata.name, {
	icon: skipLinkIcon,
	edit: Edit,
	save: () => null,
} );
