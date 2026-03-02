/**
 * SGS Mobile Nav Toggle block.
 *
 * @since 1.0.0
 * @package SGS\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import { mobileNavToggleIcon } from '../../utils/icons';
import './style.css';

registerBlockType( metadata.name, {
	icon: mobileNavToggleIcon,
	edit: Edit,
	save: () => null,
} );
