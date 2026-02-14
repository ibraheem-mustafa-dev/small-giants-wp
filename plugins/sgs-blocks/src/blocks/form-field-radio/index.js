import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldRadioIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldRadioIcon,
	edit,
	save: () => null,
} );
