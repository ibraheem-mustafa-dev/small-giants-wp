/**
 * SGS Mobile Nav Drawer block.
 *
 * @since 1.0.0
 * @package SGS\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import './style.css';

registerBlockType( metadata.name, {
	edit: Edit,
	save,
} );
