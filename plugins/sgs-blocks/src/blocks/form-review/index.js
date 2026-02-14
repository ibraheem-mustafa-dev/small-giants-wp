import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formReviewIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formReviewIcon,
	edit,
	save: () => null,
} );
