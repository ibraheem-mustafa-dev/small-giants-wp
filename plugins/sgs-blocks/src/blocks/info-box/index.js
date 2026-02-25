import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import deprecated from './deprecated';
import './style.css';
import './editor.css';
import { infoBoxIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: infoBoxIcon,
	edit: Edit,
	save: Save,
	deprecated,
} );
