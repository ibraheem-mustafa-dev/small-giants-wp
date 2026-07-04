import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import './style.css';
import './editor.css';
import { featureGridIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: featureGridIcon,
	edit: Edit,
	save,
} );
