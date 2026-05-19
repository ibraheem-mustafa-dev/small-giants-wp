/**
 * SGS Mobile Navigation block registration.
 *
 * @package SGS\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import './style.css';
import './editor.css';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import deprecated from './deprecated';

registerBlockType( metadata.name, {
	edit: Edit,
	save,
	deprecated,
} );
