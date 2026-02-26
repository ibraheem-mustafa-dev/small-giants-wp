import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldHiddenIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldHiddenIcon,
	edit,
	save: () => null,
} );
