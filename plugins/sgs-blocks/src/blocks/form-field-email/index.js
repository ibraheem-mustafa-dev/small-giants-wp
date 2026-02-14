import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldEmailIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldEmailIcon,
	edit,
	save: () => null,
} );
