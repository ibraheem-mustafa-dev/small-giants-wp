import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldDateIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldDateIcon,
	edit,
	save: () => null,
} );
