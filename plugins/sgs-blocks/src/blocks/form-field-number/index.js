import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldNumberIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldNumberIcon,
	edit,
	save: () => null,
} );
