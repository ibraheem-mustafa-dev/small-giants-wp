import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import deprecated from './deprecated';
import { accordionItemIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: accordionItemIcon,
	edit,
	save: () => null,
	deprecated,
} );
