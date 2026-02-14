import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldTextIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldTextIcon,
	edit,
	save: () => null,
} );
