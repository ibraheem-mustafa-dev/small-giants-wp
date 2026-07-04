import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import save from './save';
import metadata from './block.json';
import { accordionItemIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: accordionItemIcon,
	edit,
	save,
} );
