import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import { accordionIcon } from '../../utils';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	icon: accordionIcon,
	edit: Edit,
	save: Save,
} );
