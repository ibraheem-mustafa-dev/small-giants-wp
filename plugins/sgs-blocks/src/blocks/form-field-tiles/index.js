import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';
import { formFieldTilesIcon } from '../../utils';

registerBlockType( metadata.name, {
	...metadata,
	icon: formFieldTilesIcon,
	edit,
	save: () => null,
} );
