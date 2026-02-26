import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldAddressIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldAddressIcon,
	edit,
	save: () => null,
} );
