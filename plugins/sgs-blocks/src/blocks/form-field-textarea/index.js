import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldTextareaIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldTextareaIcon,
	edit,
	save: () => null,
} );
