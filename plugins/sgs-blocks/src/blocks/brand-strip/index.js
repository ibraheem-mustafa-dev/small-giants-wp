import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';
import { brandStripIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: brandStripIcon,
	edit: Edit,
	save: Save,
} );
