import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';
import { ctaSectionIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: ctaSectionIcon,
	edit: Edit,
	save: Save,
} );
