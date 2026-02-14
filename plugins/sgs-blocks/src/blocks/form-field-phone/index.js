import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldPhoneIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldPhoneIcon,
	edit,
	save: () => null,
} );
