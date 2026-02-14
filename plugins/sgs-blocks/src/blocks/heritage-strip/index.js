import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';
import { heritageStripIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: heritageStripIcon,
	edit: Edit,
	save: Save,
} );
