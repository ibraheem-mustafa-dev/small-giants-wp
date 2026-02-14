import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldFileIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldFileIcon,
	edit,
	save: () => null,
} );
