import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldConsentIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldConsentIcon,
	edit,
	save: () => null,
} );
